import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'
import { CommitmentsProvider } from './commitments.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CommitmentsProvider>
        <App />
      </CommitmentsProvider>
    </AuthProvider>
  </React.StrictMode>,
)
