import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { WORLD_IMAGE, worldPins } from '../data/worldPins'
import DetailLayer from './DetailLayer'
import { useAuth } from '../auth.jsx'
import { useCommitments } from '../commitments.jsx'

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

function Pins({ onSelect, bySlug }) {
  const map = useMap()
  const icons = useMemo(() => {
    const make = (modifier) =>
      L.divIcon({
        className: `explora-pin${modifier ? ` explora-pin--${modifier}` : ''}`,
        html: '<span class="explora-pin__pulse"></span><span class="explora-pin__dot"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
    return { open: make(''), committed: make('committed'), uncovered: make('uncovered') }
  }, [])

  return worldPins.map((pin) => (
    <Marker
      key={pin.id}
      position={toLatLng(pin)}
      icon={icons[bySlug[pin.id] ? bySlug[pin.id].status : 'open']}
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

export default function WorldMap({ onExit, onRequireLogin }) {
  const { user } = useAuth()
  const { items, bySlug, justUncovered, dismissUncovered, position, geoError, distances, requestLocation } = useCommitments()
  const active_ = items.find((c) => c.status === 'committed')
  const [active, setActive] = useState(null) // { pin, origin } | null
  const [panelOpen, setPanelOpen] = useState(false)

  const openFromPanel = (slug) => {
    const pin = worldPins.find((p) => p.id === slug)
    if (!pin) return
    setPanelOpen(false)
    setActive({ pin, origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 } })
  }

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
        <Pins bySlug={bySlug} onSelect={(pin, origin) => setActive({ pin, origin })} />
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

      {user && (
        <button
          onClick={() => setPanelOpen((v) => !v)}
          data-testid="my-commitments-toggle"
          className="absolute top-4 right-4 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:bg-white hover:text-gray-900"
          style={{
            zIndex: 1000,
            backgroundColor: 'rgba(10, 15, 30, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
          }}
        >
          My Commitments ({items.length})
        </button>
      )}

      {user && panelOpen && (
        <div
          className="absolute top-16 right-4 w-80 max-w-[calc(100vw-2rem)] rounded-xl p-4"
          data-testid="my-commitments-panel"
          style={{
            zIndex: 1000,
            backgroundColor: 'rgba(10, 15, 30, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <h3 className="text-sm font-semibold text-white mb-3">My Commitments</h3>
          {items.length === 0 ? (
            <p className="text-xs text-gray-400">
              Nothing yet. Open a pin and commit to a place you intend to go and uncover.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openFromPanel(c.slug)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm text-white hover:bg-white/10"
                  >
                    <span>{c.name}</span>
                    <span
                      className="text-xs"
                      style={{ color: c.status === 'uncovered' ? '#4ADE80' : '#4F8EF7' }}
                    >
                      {c.status === 'uncovered' ? 'Uncovered' : 'Committed'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {justUncovered.length > 0 && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm text-white flex items-center gap-4"
          role="status"
          data-testid="uncovered-toast"
          style={{
            zIndex: 1000,
            backgroundColor: 'rgba(5, 46, 22, 0.92)',
            border: '1px solid rgba(74, 222, 128, 0.6)',
          }}
        >
          <span>
            Uncovered:{' '}
            {justUncovered
              .map((slug) => (worldPins.find((p) => p.id === slug) || { name: slug }).name)
              .join(', ')}
          </span>
          <button onClick={dismissUncovered} className="text-green-300 hover:text-white" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {user && (
        <div
          className="absolute bottom-5 left-4 px-4 py-3 rounded-xl text-xs text-gray-200"
          data-testid="position-hud"
          style={{
            zIndex: 1000,
            maxWidth: 'calc(100vw - 6rem)',
            backgroundColor: 'rgba(10, 15, 30, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <p className="font-semibold text-white mb-1">Your position</p>
          {position ? (
            <p data-testid="position-coords" className="font-mono">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </p>
          ) : (
            <>
              <p className="text-gray-400 mb-2">{geoError || 'Location not shared yet.'}</p>
              <button
                onClick={requestLocation}
                data-testid="enable-location"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: '#4F8EF7', color: 'white' }}
              >
                Share my location
              </button>
            </>
          )}
          {active_ && (
            <p className="mt-2" data-testid="position-distance">
              <span style={{ color: '#4F8EF7' }}>{active_.name}</span>
              {' · '}
              {distances[active_.slug] !== undefined
                ? `${Number(distances[active_.slug]).toLocaleString('en', { maximumFractionDigits: 1 })} km away`
                : position
                  ? 'calculating distance…'
                  : 'distance unavailable'}
            </p>
          )}
        </div>
      )}

      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs text-gray-200 pointer-events-none hidden lg:block"
        style={{
          zIndex: 1000,
          backgroundColor: 'rgba(10, 15, 30, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        Select a pin to enter a region
      </div>

      {active && (
        <DetailLayer
          pin={active.pin}
          origin={active.origin}
          onClose={() => setActive(null)}
          onRequireLogin={onRequireLogin}
        />
      )}
    </div>
  )
}
