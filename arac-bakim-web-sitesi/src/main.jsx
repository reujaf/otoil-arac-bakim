import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f3f4f6;">
        <div style="max-width: 400px; background: white; border-radius: 8px; padding: 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 16px;">Bir Hata Oluştu</h2>
          <p style="color: #6b7280; margin-bottom: 24px;">Uygulama yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.</p>
          <button onclick="window.location.reload()" style="background: #26a9e0; color: white; font-weight: 500; padding: 8px 24px; border-radius: 6px; border: none; cursor: pointer;">
            Sayfayı Yenile
          </button>
        </div>
      </div>
    `;
  }
}
