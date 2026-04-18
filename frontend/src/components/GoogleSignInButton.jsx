import React, { useEffect, useRef } from 'react'

export default function GoogleSignInButton({ onCredential, label = 'Lanjut dengan Google' }) {
  const containerRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return
    if (!containerRef.current) return

    let canceled = false
    const start = Date.now()

    const tryInit = () => {
      if (canceled) return
      const google = window.google?.accounts?.id
      if (!google) {
        if (Date.now() - start > 4000) return
        setTimeout(tryInit, 50)
        return
      }

      google.initialize({
        client_id: clientId,
        callback: (resp) => {
          const cred = resp?.credential
          if (cred) onCredential(cred)
        },
      })

      containerRef.current.innerHTML = ''
      google.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 360,
      })
    }

    tryInit()
    return () => {
      canceled = true
    }
  }, [clientId, onCredential])

  return (
    <div>
      <div ref={containerRef} />
      {!clientId ? <div className="mt-2 text-xs text-slate-500">{label}: VITE_GOOGLE_CLIENT_ID belum diset.</div> : null}
    </div>
  )
}
