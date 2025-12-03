import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import App from './App';
import './index.css';

// Eski yöntem (React 17 ve öncesi):
// ReactDOM.render(<App />, document.getElementById('root'));

// Yeni yöntem (React 18 ve sonrası):
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);