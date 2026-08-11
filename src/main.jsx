import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { registerVercelObservability } from './observability.js'
import { registerServiceWorker } from './services/serviceWorker.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

registerVercelObservability()
registerServiceWorker()
