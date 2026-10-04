import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { API_BASE, useAuth } from './auth.jsx'

const CommitmentsContext = createContext(null)

export function CommitmentsProvider({ children }) {
  const { token, logout } = useAuth()
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [justUncovered, setJustUncovered] = useState([]) // slugs uncovered by the latest check

  // Authenticated request. A 401 means the token expired or was revoked: end the session.
  const request = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      })
      if (res.status === 401 || res.status === 422) {
        logout()
        throw new Error('Session expired, please log in again.')
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.msg || `Request failed (${res.status})`)
      return body
    },
    [token, logout],
  )

  useEffect(() => {
    if (!token) {
      setItems([])
      setError(null)
      return undefined
    }
    let cancelled = false
    request('/commitments')
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [token, request])

  const run = useCallback(async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const commit = useCallback(
    (slug) =>
      run(async () => {
        const c = await request('/commitments', { method: 'POST', body: JSON.stringify({ slug }) })
        setItems((prev) => (prev.some((p) => p.id === c.id) ? prev : [c, ...prev]))
      }),
    [request, run],
  )

  const remove = useCallback(
    (id) =>
      run(async () => {
        await request(`/commitments/${id}`, { method: 'DELETE' })
        setItems((prev) => prev.filter((p) => p.id !== id))
      }),
    [request, run],
  )

  // Automatic uncovering: while at least one commitment is still open, watch the device
  // position and let the server decide (it checks the distance to the place). At most one
  // check per minute. Denied or unavailable geolocation simply leaves commitments open.
  const hasOpen = items.some((c) => c.status === 'committed')
  useEffect(() => {
    if (!token || !hasOpen || !('geolocation' in navigator)) return undefined
    let lastCheck = 0
    let cancelled = false
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastCheck < 60_000) return
        lastCheck = now
        request('/commitments/verify', {
          method: 'POST',
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        })
          .then((res) => {
            if (cancelled) return
            setItems(res.commitments)
            if (res.newly_uncovered.length) setJustUncovered(res.newly_uncovered)
          })
          .catch(() => {})
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    )
    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [token, hasOpen, request])

  const dismissUncovered = useCallback(() => setJustUncovered([]), [])

  const bySlug = useMemo(() => Object.fromEntries(items.map((c) => [c.slug, c])), [items])

  const value = { items, bySlug, busy, error, commit, remove, justUncovered, dismissUncovered }
  return <CommitmentsContext.Provider value={value}>{children}</CommitmentsContext.Provider>
}

export function useCommitments() {
  const ctx = useContext(CommitmentsContext)
  if (!ctx) throw new Error('useCommitments must be used inside CommitmentsProvider')
  return ctx
}
