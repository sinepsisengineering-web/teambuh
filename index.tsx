import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConfirmationProvider } from './contexts/ConfirmationProvider';
import { AuthProvider } from './contexts/AuthContext';
import { TaskModalProvider } from './contexts/TaskModalContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ConfirmationProvider>
        <TaskModalProvider>
          <App />
        </TaskModalProvider>
      </ConfirmationProvider>
    </AuthProvider>
  </React.StrictMode>
);