import React from 'react'

const features = [
  {
    icon: '📍',
    title: 'Location Context',
    description:
      'Query any lat/lng coordinate and receive curated historical and cultural context snippets from our growing database.',
  },
  {
    icon: '🤖',
    title: 'AI-Generated Media',
    description:
      'Automatically generate stunning AI imagery for any location using state-of-the-art models via our Celery-powered async pipeline.',
  },
  {
    icon: '🗺️',
    title: 'Geospatial Precision',
    description:
      'Built on PostGIS and GeoAlchemy2 for accurate radius-based spatial queries. JWT-secured endpoints for safe access.',
  },
]

export default function InfoSection() {
  return (
    <section className="relative z-10 flex flex-col items-center px-6 pt-36 pb-24">
      {/* Hero text */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
          style={{
            backgroundColor: 'rgba(79, 142, 247, 0.15)',
            border: '1px solid rgba(79, 142, 247, 0.35)',
            color: '#4F8EF7',
          }}
        >
          <span>🌐</span>
          <span>Location Intelligence Platform</span>
        </div>

        <h1
          className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6"
          style={{ letterSpacing: '-0.03em', textShadow: '0 2px 30px rgba(0,0,0,0.6)' }}
        >
          Explore the World
          <br />
          <span style={{ color: '#4F8EF7' }}>Around You</span>
        </h1>

        <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
          Explora is a location-aware API platform that delivers rich contextual information,
          historical snippets, and AI-generated media for any point on Earth.
        </p>

        <div className="flex items-center justify-center gap-4 mt-8">
          <a
            href="https://explora-production-b6ef.up.railway.app/apidocs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: '#4F8EF7',
              boxShadow: '0 0 28px rgba(79, 142, 247, 0.4)',
            }}
          >
            View API Docs
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Learn more
          </a>
        </div>
      </div>

      {/* Feature cards */}
      <div
        id="features"
        className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {features.map((feat) => (
          <div
            key={feat.title}
            className="flex flex-col gap-4 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1"
            style={{
              backgroundColor: 'rgba(13, 18, 35, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center rounded-xl text-2xl"
              style={{
                backgroundColor: 'rgba(79, 142, 247, 0.12)',
                border: '1px solid rgba(79, 142, 247, 0.2)',
              }}
            >
              {feat.icon}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* API docs link */}
      <div className="mt-10">
        <a
          href="https://explora-production-b6ef.up.railway.app/apidocs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-150 hover:gap-2.5"
          style={{ color: '#4F8EF7' }}
        >
          View API Docs →
        </a>
      </div>
    </section>
  )
}
