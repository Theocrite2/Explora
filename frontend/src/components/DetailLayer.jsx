import React, { useCallback, useEffect, useRef, useState } from 'react'

const CLOSE_MS = 320

// Full-screen regional map that opens from a pin. `origin` is the pin's position in
// pixels inside the parent container, so the layer grows out of the pin.
export default function DetailLayer({ pin, origin, onClose }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(closeTimer.current)
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div
      className={`explora-detail${open ? ' explora-detail--open' : ''}`}
      style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
      role="dialog"
      aria-modal="true"
      aria-label={`${pin.name} regional map`}
    >
      <div className="flex flex-col md:flex-row w-full h-full">
        <div className="relative flex-1 min-h-0 flex items-center justify-center p-4 md:p-8">
          <img
            src={pin.detailImage}
            alt={`${pin.name} regional map`}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)' }}
          />
        </div>

        <aside
          className="md:w-[360px] shrink-0 p-6 md:p-8 flex flex-col justify-center gap-4"
          style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <button
            onClick={close}
            className="self-start px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:bg-white hover:text-gray-900"
            style={{ border: '1px solid rgba(255, 255, 255, 0.35)' }}
          >
            ← Back to world map
          </button>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: '#F5C451' }}
            >
              {pin.region}
            </p>
            <h2 className="text-2xl font-bold text-white mb-3">{pin.name}</h2>
            <p className="text-sm text-gray-300 leading-relaxed">{pin.summary}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
