'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { finishSpotifyLogin } from '@/lib/spotify'

export default function SpotifyCallback() {
  const router = useRouter()
  const [msg, setMsg] = useState('Connecting Spotify…')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      setMsg('Spotify connection was cancelled')
      setTimeout(() => router.replace('/music'), 1200)
      return
    }
    finishSpotifyLogin(code)
      .then(() => router.replace('/music'))
      .catch(() => setMsg('Spotify did not let us in. Ask Tanzim to add you to the Spotify app’s users.'))
  }, [router])
  return (
    <main className="page center">
      <div style={{ fontSize: 40, marginTop: 80 }} className="float">
        🎧
      </div>
      <p className="muted">{msg}</p>
    </main>
  )
}
