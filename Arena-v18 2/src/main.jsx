import React from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './Redesign.css'
import './ContrastHardening.css'
import './BrandPaletteV17_2.css'
import './FinalUIHardeningV17_3.css'
import './FinalUIMasterV17_4.css'
import './FinalUIV17_7.css'
import './V17_8_Final.css'
import './V18_Final.css'
import './ArenaStudio.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
)
