import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App.tsx'

// Debug: Check if root element exists
console.log('main.tsx executing...')
const rootElement = document.getElementById('root')
console.log('Root element:', rootElement)

if (!rootElement) {
  console.error('Root element not found!')
  document.body.innerHTML = '<div style="padding: 20px; color: red;"><h1>Error: Root element not found</h1><p>Make sure index.html has a div with id="root"</p></div>'
} else {
  console.log('Rendering App...')
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('App rendered successfully')
  } catch (error) {
    console.error('Error rendering App:', error)
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error Rendering App</h1>
        <pre>${String(error)}</pre>
        <pre>${error instanceof Error ? error.stack : ''}</pre>
      </div>
    `
  }
}
