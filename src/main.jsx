// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { NhostProvider, NhostClient } from '@nhost/react';
import { NhostApolloProvider } from '@nhost/react-apollo';

const nhost = new NhostClient({
  subdomain: 'zqxgevbflxgdjclkxeqp', // Replace with your subdomain
  region: 'ap-south-1'      // Replace with your region
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NhostProvider nhost={nhost}>
      <NhostApolloProvider nhost={nhost}>
        <App />
      </NhostApolloProvider>
    </NhostProvider>
  </React.StrictMode>
);