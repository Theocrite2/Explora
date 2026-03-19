import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE = 'https://explora-production-b6ef.up.railway.app/api'

export default function AuthModal({ mode, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text: string }
  const [loading, setLoading] = useState(false)
  const modalRef = useRef(null)

  const isLogin = mode === 'login'
  const title = isLogin ? 'Welcome back' : 'Create your account'
  const submitLabel = isLogin ? 'Sign in' : 'Create account'

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus trap / lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!isLogin && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      const endpoint = isLogin ? `${API_BASE}/login` : `${API_BASE}/register`
      const res = await axios.post(endpoint, { email, password })
      setMessage({
        type: 'success',
        text: isLogin
          ? 'Signed in successfully! Welcome back.'
          : 'Account created successfully! You can now log in.',
      })
      // Optionally close after a short delay on success
      setTimeout(() => onClose(), 1800)
    } catch (err) {
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        'Something went wrong. Please try again.'
      setMessage({ type: 'error', text: detail })
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      {/* Modal card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          backgroundColor: 'rgba(13, 18, 35, 0.97)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-150 p-1 rounded-md hover:bg-white/10"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🌍</span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4F8EF7' }}>
              Explora
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {isLogin
              ? 'Sign in to access your account and explore the world.'
              : 'Join Explora and start exploring location intelligence.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="auth-email">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all duration-150 focus:ring-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                '--tw-ring-color': '#4F8EF7',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all duration-150 focus:ring-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                '--tw-ring-color': '#4F8EF7',
              }}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="auth-confirm">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all duration-150 focus:ring-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  '--tw-ring-color': '#4F8EF7',
                }}
              />
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`text-sm rounded-lg px-4 py-3 ${
                message.type === 'success'
                  ? 'text-green-300 bg-green-900/30 border border-green-500/30'
                  : 'text-red-300 bg-red-900/30 border border-red-500/30'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#4F8EF7',
              boxShadow: '0 0 24px rgba(79, 142, 247, 0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {isLogin ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </form>

        {/* Footer toggle */}
        <p className="mt-5 text-center text-sm text-gray-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            className="font-medium hover:underline transition-colors"
            style={{ color: '#4F8EF7' }}
            onClick={() => {
              setMessage(null)
              setEmail('')
              setPassword('')
              setConfirmPassword('')
              onClose()
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
