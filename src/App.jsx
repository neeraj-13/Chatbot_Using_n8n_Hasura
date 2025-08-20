// src/App.jsx

import { useState } from 'react';
import { useNhostClient, useSignOut, useUserId, useAuthenticationStatus, useSignUpEmailPassword, useSignInEmailPassword } from '@nhost/react';
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';

// GraphQL Queries, Mutations, and Subscriptions
const GET_CHATS = gql`
  query GetChats {
    chats(orderBy: { createdAt: desc }) {
      id
      messages(limit: 1, orderBy: { createdAt: desc }) {
        content
      }
    }
  }
`;

const GET_MESSAGES = gql`
  subscription GetMessages($chatId: uuid!) {
    messages(where: { chatId: { _eq: $chatId } }, orderBy: { createdAt: asc }) {
      id
      content
      sender
    }
  }
`;

const INSERT_CHAT = gql`
  mutation InsertChat($userId: String!) {
    insert_chats_one(object: { userId: $userId }) {
      id
    }
  }
`;

const INSERT_MESSAGE = gql`
  mutation InsertMessage($chatId: uuid!, $content: String!) {
    insert_messages_one(object: { chatId: $chatId, content: $content, sender: "user" }) {
      id
    }
  }
`;

const SEND_MESSAGE_ACTION = gql`
  mutation SendMessageAction($chatId: uuid!, $message: String!) {
    sendMessage(chatId: $chatId, message: $message) {
      response
    }
  }
`;


// Main App Component
const App = () => {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <AuthComponent />;
  }

  return <ChatComponent />;
};


// Authentication Component
const AuthComponent = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signUpEmailPassword, isLoading: isSigningUp } = useSignUpEmailPassword();
  const { signInEmailPassword, isLoading: isSigningIn } = useSignInEmailPassword();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      await signUpEmailPassword(email, password);
    } else {
      await signInEmailPassword(email, password);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isSigningUp || isSigningIn}>
          {isSigningUp || isSigningIn ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
        <p onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </p>
      </form>
    </div>
  );
};


// Chat Component
const ChatComponent = () => {
  const userId = useUserId();
  const { signOut } = useSignOut();
  const [activeChatId, setActiveChatId] = useState(null);

  // Fetch chats for the sidebar
  const { data: chatsData, loading: chatsLoading, refetch: refetchChats } = useQuery(GET_CHATS);

  // Mutation to create a new chat
  const [insertChat] = useMutation(INSERT_CHAT);

  const handleNewChat = async () => {
    const result = await insertChat({ variables: { userId } });
    await refetchChats();
    setActiveChatId(result.data.insert_chats_one.id);
  };

  return (
    <div className="container">
      <div className="sidebar">
        <button className="new-chat-button" onClick={handleNewChat}>+ New Chat</button>
        <div className="chat-list">
          {chatsLoading ? (
            <p>Loading chats...</p>
          ) : (
            chatsData?.chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-list-item ${activeChatId === chat.id ? 'active' : ''}`}
                onClick={() => setActiveChatId(chat.id)}
              >
                {chat.messages[0]?.content || 'New Chat'}
              </div>
            ))
          )}
        </div>
        <button className="sign-out-button" onClick={signOut}>Sign Out</button>
      </div>
      <div className="chat-view">
        {activeChatId ? (
          <MessageView chatId={activeChatId} />
        ) : (
          <div style={{ margin: 'auto' }}>Select a chat or start a new one</div>
        )}
      </div>
    </div>
  );
};


// Message View Component
const MessageView = ({ chatId }) => {
  const [message, setMessage] = useState('');
  
  // Subscribe to messages for the active chat
  const { data, loading } = useSubscription(GET_MESSAGES, {
    variables: { chatId },
  });

  const [insertMessage] = useMutation(INSERT_MESSAGE);
  const [sendMessageAction] = useMutation(SEND_MESSAGE_ACTION);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const originalMessage = message;
    setMessage('');

    // 1. Save user's message to the database
    await insertMessage({ variables: { chatId, content: originalMessage } });
    
    // 2. Call the Hasura Action to trigger the chatbot
    await sendMessageAction({ variables: { chatId, message: originalMessage } });
  };

  if (loading) return <div style={{ margin: 'auto' }}>Loading messages...</div>;

  return (
    <>
      <div className="messages-container">
        <div className='message-list'>
          {data?.messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              {msg.content}
            </div>
          ))}
        </div>
      </div>
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
};

export default App;