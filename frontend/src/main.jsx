import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { refreshI18n } from './i18n'

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5116'
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

if (localStorage.getItem('auth_token')) {
  refreshI18n().catch(() => {})
}
window.addEventListener('auth-updated', () => {
  if (localStorage.getItem('auth_token')) refreshI18n().catch(() => {})
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
