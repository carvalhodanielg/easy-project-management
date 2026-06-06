import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { applyTheme, getPersistedTheme } from './lib/theme';

// Apply the persisted theme before render to avoid a flash of the wrong theme.
applyTheme(getPersistedTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
