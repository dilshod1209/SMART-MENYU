import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for fetch related errors in certain environments (like Vite 6 + iframe)
if (typeof window !== 'undefined') {
  // Define a dummy global that mirrors window but allows overwriting properties
  const globalProxy = new Proxy(window, {
    get(target, prop) {
      if (prop === 'global') return globalProxy;
      if (prop === 'globalThis') return globalProxy;
      const value = (target as any)[prop];
      if (typeof value === 'function') return value.bind(target);
      return value;
    },
    set(target, prop, value) {
      if (prop === 'fetch') {
        // Silently ignore attempts to set fetch on the global proxy
        return true;
      }
      try {
        (target as any)[prop] = value;
      } catch (e) {
        // Some properties are read-only on window
        console.warn(`Could not set property ${String(prop)} on window:`, e);
      }
      return true;
    }
  });

  (window as any).global = globalProxy;
  
  // Try to make window.fetch configurable if possible
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (desc && !desc.writable && desc.configurable) {
      const originalFetch = window.fetch.bind(window);
      Object.defineProperty(window, 'fetch', {
        value: originalFetch,
        writable: true,
        configurable: true
      });
    }
  } catch (e) {
    // Ignore errors here
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
