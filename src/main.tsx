import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
} catch (error) {
  console.error('Failed to render:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error during initialization</h1><pre>${error instanceof Error ? error.stack : String(error)}</pre></div>`;
}
