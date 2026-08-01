// On-Screen Mobile Error Handler
window.onerror = function (msg, source, lineno, colno, error) {
  const containerId = 'mobile-debug-error-overlay';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);color:#ff4d4d;z-index:999999;padding:16px;box-sizing:border-box;overflow:auto;font-family:monospace;font-size:14px;word-break:break-word;';
    document.body ? document.body.appendChild(container) : window.addEventListener('DOMContentLoaded', () => document.body.appendChild(container!));
  }
  const errorCard = document.createElement('div');
  errorCard.style.cssText =
    'margin-bottom:16px;padding:12px;border:2px solid #ff4d4d;background:#1a0000;border-radius:8px;';
  errorCard.innerHTML = `<h3 style="margin:0 0 8px 0;font-size:16px;color:#ff6666;">JavaScript Error</h3>
    <div style="font-weight:bold;margin-bottom:6px;font-size:15px;color:#ffffff;">${msg}</div>
    ${source ? `<div style="color:#ffb3b3;font-size:12px;margin-bottom:4px;">At: ${source}:${lineno}:${colno}</div>` : ''}
    ${error?.stack ? `<pre style="margin:8px 0 0 0;white-space:pre-wrap;font-size:11px;color:#ffcccc;max-height:200px;overflow:auto;">${error.stack}</pre>` : ''}`;
  container.appendChild(errorCard);
  return false;
};

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || String(reason || 'Unhandled Promise Rejection');
  const stack = reason?.stack || '';
  const containerId = 'mobile-debug-error-overlay';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);color:#ff4d4d;z-index:999999;padding:16px;box-sizing:border-box;overflow:auto;font-family:monospace;font-size:14px;word-break:break-word;';
    document.body ? document.body.appendChild(container) : window.addEventListener('DOMContentLoaded', () => document.body.appendChild(container!));
  }
  const errorCard = document.createElement('div');
  errorCard.style.cssText =
    'margin-bottom:16px;padding:12px;border:2px solid #ff4d4d;background:#1a0000;border-radius:8px;';
  errorCard.innerHTML = `<h3 style="margin:0 0 8px 0;font-size:16px;color:#ff6666;">Unhandled Rejection</h3>
    <div style="font-weight:bold;margin-bottom:6px;font-size:15px;color:#ffffff;">${msg}</div>
    ${stack ? `<pre style="margin:8px 0 0 0;white-space:pre-wrap;font-size:11px;color:#ffcccc;max-height:200px;overflow:auto;">${stack}</pre>` : ''}`;
  container.appendChild(errorCard);
});

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
