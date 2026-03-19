import React from 'react'

export default function MapBackground() {
  return (
    <div
      className="fixed inset-0 z-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* World map image */}
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/2560px-World_map_-_low_resolution.svg.png"
        alt="World map background"
        className="w-full h-full object-cover"
        style={{ filter: 'brightness(0.6) saturate(0.4)' }}
        draggable="false"
      />
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
      />
    </div>
  )
}
