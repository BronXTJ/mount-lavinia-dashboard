import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

window.addEventListener('error', (event) => {
  console.error('window.onerror', event.error || event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('unhandledrejection', event.reason)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/mount-lavinia-dashboard/">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
