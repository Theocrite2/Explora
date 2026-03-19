import React from 'react'

export default function Navbar({ onLoginClick, onSignupClick }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{
        backgroundColor: 'rgba(10, 15, 30, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" role="img" aria-label="globe">🌍</span>
        <span
          className="text-white font-bold text-2xl tracking-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          Explora
        </span>
      </div>

      {/* Auth buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onLoginClick}
          className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:bg-white hover:text-gray-900"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.35)',
          }}
        >
          Login
        </button>
        <button
          onClick={onSignupClick}
          className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: '#4F8EF7',
            boxShadow: '0 0 20px rgba(79, 142, 247, 0.35)',
          }}
        >
          Sign Up
        </button>
      </div>
    </nav>
  )
}
