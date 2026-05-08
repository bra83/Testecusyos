import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  console.log('App initialization started');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error('Failed to render:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error during initialization</h1><pre>${error instanceof Error ? error.stack : String(error)}</pre></div>`;
}
