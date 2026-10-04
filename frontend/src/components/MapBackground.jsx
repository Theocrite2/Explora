import React from 'react'

export default function MapBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#0d1117',
        backgroundImage:
          'linear-gradient(rgba(13, 17, 23, 0.55), rgba(13, 17, 23, 0.55)), url(/world-map.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
