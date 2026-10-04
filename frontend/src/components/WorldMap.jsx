import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { WORLD_IMAGE, worldPins } from '../data/worldPins'
import DetailLayer from './DetailLayer'

const W = WORLD_IMAGE.width
const H = WORLD_IMAGE.height
const BOUNDS = [
  [0, 0],
  [H, W],
]
const MAX_EXTRA_ZOOM = 1.5

// CRS.Simple: latitude is the vertical axis and grows upward, so image y is flipped.
const toLatLng = (pin) => [H - pin.y, pin.x]

// Fit the whole image in the viewport, use that as the minimum zoom, and allow a
// limited zoom-in beyond it. Re-applied when the container is resized.
function FitToImage() {
  const map = useMap()

  useEffect(() => {
    const apply = (initial) => {
      if (initial) map.invalidateSize()
      const fitZoom = map.getBoundsZoom(BOUNDS, false)
      map.setMinZoom(fitZoom)
      map.setMaxZoom(fitZoom + MAX_EXTRA_ZOOM)
      if (initial) map.setView([H / 2, W / 2], fitZoom, { animate: false })
      else if (map.getZoom() < fitZoom) map.setZoom(fitZoom, { animate: false })
    }
    apply(true)
    const onResize = () => apply(false)
    map.on('resize', onResize)
    return () => {
      map.off('resize', onResize)
    }
  }, [map])

  return null
}

function Pins({ onSelect }) {
  const map = useMap()
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'explora-pin',
        html: '<span class="explora-pin__pulse"></span><span class="explora-pin__dot"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    [],
  )

  return worldPins.map((pin) => (
    <Marker
      key={pin.id}
      position={toLatLng(pin)}
      icon={icon}
      title={pin.name}
      alt={pin.name}
      eventHandlers={{
        click: () => {
          const point = map.latLngToContainerPoint(toLatLng(pin))
          onSelect(pin, { x: point.x, y: point.y })
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -12]}>
        {pin.name}
      </Tooltip>
    </Marker>
  ))
}

export default function WorldMap({ onExit }) {
  const [active, setActive] = useState(null) // { pin, origin } | null

  // Preload the regional maps so a pin opens instantly.
  useEffect(() => {
    worldPins.forEach((pin) => {
      const img = new Image()
      img.src = pin.detailImage
    })
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 65, // below the fixed Navbar
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        backgroundColor: '#0d1117',
      }}
    >
      <MapContainer
        crs={L.CRS.Simple}
        center={[H / 2, W / 2]}
        zoom={0}
        zoomSnap={0.25}
        zoomDelta={0.5}
        maxBounds={BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <ImageOverlay url={WORLD_IMAGE.src} bounds={BOUNDS} />
        <FitToImage />
        <ZoomControl position="bottomright" />
        <Pins onSelect={(pin, origin) => setActive({ pin, origin })} />
      </MapContainer>

      <button
        onClick={onExit}
        className="absolute top-4 left-4 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:bg-white hover:text-gray-900"
        style={{
          zIndex: 1000,
          backgroundColor: 'rgba(10, 15, 30, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
        }}
      >
        ← Home
      </button>

      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs text-gray-200 pointer-events-none"
        style={{
          zIndex: 1000,
          backgroundColor: 'rgba(10, 15, 30, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        Select a pin to enter a region
      </div>

      {active && (
        <DetailLayer pin={active.pin} origin={active.origin} onClose={() => setActive(null)} />
      )}
    </div>
  )
}
