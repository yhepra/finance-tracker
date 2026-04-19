import React, { useEffect, useRef } from 'react'
import { getGoogleClientId } from '../config/env'

export default function GoogleSignInButton({ onCredential, label = 'Lanjut dengan Google' }) {
  const containerRef = useRef(null)
  const clientId = getGoogleClientId()

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
        ux_mode: 'popup',
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
    <div className="flex flex-col items-center justify-center w-full">
      <div 
        ref={containerRef} 
        className="flex justify-center w-full min-h-[44px] hover:scale-[1.01] transition-transform duration-200"
      />
      {!clientId ? (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-[10px] text-amber-700 font-bold uppercase tracking-wider text-center">
          ⚠️ {label}: GOOGLE CLIENT ID BELUM DISET
        </div>
      ) : null}
    </div>
  )
}
