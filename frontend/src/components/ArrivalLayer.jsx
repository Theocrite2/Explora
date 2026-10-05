import React, { useEffect } from 'react'
import { useCommitments } from '../commitments.jsx'
import { worldPins } from '../data/worldPins'

// Shown when the server confirms the member has entered the area of a place they committed
// to. Uses an image that already exists (a stored one from the API, otherwise the place's
// regional map). Nothing is generated.
export default function ArrivalLayer() {
  const { justUncovered, items, dismissUncovered } = useCommitments()
  const slug = justUncovered[0]

  useEffect(() => {
    if (!slug) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') dismissUncovered()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [slug, dismissUncovered])

  if (!slug) return null

  const commitment = items.find((c) => c.slug === slug)
  const pin = worldPins.find((p) => p.id === slug)
  const name = (pin && pin.name) || (commitment && commitment.name) || slug
  const image = (commitment && commitment.image_url) || (pin && pin.detailImage) || null

  return (
    <div
      className="fixed inset-0 flex flex-col md:flex-row items-center justify-center gap-6 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Arrived at ${name}`}
      data-testid="arrival"
      style={{ zIndex: 1200, backgroundColor: 'rgba(13, 17, 23, 0.96)' }}
    >
      {image && (
        <img
          src={image}
          alt={name}
          className="max-w-full max-h-[55vh] md:max-h-[85vh] md:max-w-[55vw] object-contain rounded-xl"
          style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)' }}
        />
      )}
      <div className="md:w-[360px] flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4ADE80' }}>
          You have arrived
        </p>
        <h2 className="text-3xl font-bold text-white">{name}</h2>
        {pin && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#F5C451' }}>
              {pin.region}
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{pin.summary}</p>
          </>
        )}
        <button
          onClick={dismissUncovered}
          data-testid="arrival-continue"
          className="self-start px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#4ADE80', color: '#052e16' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
