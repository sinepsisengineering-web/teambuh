import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// ==================== ИЗМЕНЕНИЕ 1: Импортируем наш провайдер ====================
import { ConfirmationProvider } from './contexts/ConfirmationProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* ==================== ИЗМЕНЕНИЕ 2: Оборачиваем App ==================== */}
    <ConfirmationProvider>
      <App />
    </ConfirmationProvider>
  </React.StrictMode>
);