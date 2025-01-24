import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ position: 'relative' }}>
      <App />
      <div style={
        { position: 'absolute', top: '80%', left: '50%', transform: 'translate(-50%, 0%)', 'fontFamily': 'sans-serif', color: 'white', 'fontWeight': 'bold' }}>Click to Swap Image</div>
    </div>
  </StrictMode>,
)
