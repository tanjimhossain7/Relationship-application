import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Us · Tanzim & Azrina',
    short_name: 'Us',
    description: 'Our little private space',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b12',
    theme_color: '#0b0b12',
    icons: [
      { src: '/app-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
