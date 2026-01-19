import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './firebase'
import { SettingsProvider } from './contexts/SettingsContext.jsx'
import { OfflineProvider } from './contexts/OfflineContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <OfflineProvider>
        <App />
      </OfflineProvider>
    </SettingsProvider>
  </StrictMode>,
)
