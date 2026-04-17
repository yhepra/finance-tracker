import axios from 'axios'

const TERMS_KEY = 'i18n_terms'
const LANG_KEY = 'prefs_language'

export function getLanguage() {
  return localStorage.getItem(LANG_KEY) || 'id'
}

export function t(key, fallback) {
  const termsRaw = localStorage.getItem(TERMS_KEY)
  if (termsRaw) {
    try {
      const terms = JSON.parse(termsRaw)
      const v = terms?.[key]
      if (typeof v === 'string' && v) return v
    } catch {
      return fallback ?? key
    }
  }
  return fallback ?? key
}

export async function refreshI18n() {
  const token = localStorage.getItem('auth_token')
  if (!token) return

  const general = await axios.get('/api/settings/general')
  const lang = general.data?.language || 'id'
  localStorage.setItem('prefs_language', lang)
  if (general.data?.dateFormat) localStorage.setItem('prefs_dateFormat', general.data.dateFormat)
  if (general.data?.numberLocale) localStorage.setItem('prefs_numberLocale', general.data.numberLocale)
  if (general.data?.defaultBankId != null) localStorage.setItem('prefs_defaultBankId', String(general.data.defaultBankId))
  else localStorage.removeItem('prefs_defaultBankId')
  window.dispatchEvent(new Event('prefs-updated'))

  const dir = await axios.get('/api/settings/directory/map')
  localStorage.setItem(TERMS_KEY, JSON.stringify(dir.data?.terms || {}))
  window.dispatchEvent(new Event('i18n-updated'))
}
