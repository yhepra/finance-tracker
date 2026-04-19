const isLocalhost = () => {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

export const getApiBaseUrl = () => {
  if (isLocalhost()) {
    return import.meta.env.VITE_API_BASE_URL_DEV ?? import.meta.env.VITE_API_BASE_URL ?? ''
  }
  return import.meta.env.VITE_API_BASE_URL_PROD ?? import.meta.env.VITE_API_BASE_URL ?? ''
}

export const getGoogleClientId = () => {
  if (isLocalhost()) {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID_DEV ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID_PROD ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
}

