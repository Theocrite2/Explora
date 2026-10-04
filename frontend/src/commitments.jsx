import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE, useAuth } from './auth.jsx'

const CommitmentsContext = createContext(null)

export function CommitmentsProvider({ children }) {
  const { token, logout } = useAuth()
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [justUncovered, setJustUncovered] = useState([]) // slugs uncovered by the latest check
  const [position, setPosition] = useState(null) // { lat, lng, accuracy } | null
  const [geoError, setGeoError] = useState(null)
  const [distances, setDistances] = useState({}) // slug -> km, from the server

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

  // Position tracking, active while logged in. The device position is shown to the member;
  // while a commitment is still open it is also sent to the server (at most once a minute),
  // which decides whether the member is at the place and returns the distance in km.
  const hasOpen = items.some((c) => c.status === 'committed')
  const hasOpenRef = useRef(hasOpen)
  hasOpenRef.current = hasOpen
  const lastCheckRef = useRef(0)
  const positionRef = useRef(null)
  const checkRef = useRef(() => {})

  checkRef.current = ({ lat, lng }) => {
    lastCheckRef.current = Date.now()
    request('/commitments/verify', { method: 'POST', body: JSON.stringify({ lat, lng }) })
      .then((res) => {
        setItems(res.commitments)
        setDistances(res.distances_km || {})
        if (res.newly_uncovered.length) setJustUncovered(res.newly_uncovered)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!token) {
      setPosition(null)
      positionRef.current = null
      setGeoError(null)
      setDistances({})
      return undefined
    }
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not available in this browser.')
      return undefined
    }
    let cancelled = false
    lastCheckRef.current = 0
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setGeoError(null)
        setPosition({ lat: latitude, lng: longitude, accuracy })
        positionRef.current = { lat: latitude, lng: longitude }
        if (hasOpenRef.current && Date.now() - lastCheckRef.current >= 60_000) {
          checkRef.current({ lat: latitude, lng: longitude })
        }
      },
      (err) => {
        if (!cancelled) {
          setGeoError(
            err.code === 1 ? 'Location permission denied.' : 'Your position could not be determined.',
          )
        }
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 30_000 },
    )
    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [token, request])

  // A newly created commitment gets its first distance at once, from the last known
  // position, instead of waiting for the next position update.
  useEffect(() => {
    if (token && hasOpen && positionRef.current) checkRef.current(positionRef.current)
  }, [token, hasOpen])

  const dismissUncovered = useCallback(() => setJustUncovered([]), [])

  const bySlug = useMemo(() => Object.fromEntries(items.map((c) => [c.slug, c])), [items])

  const value = {
    items,
    bySlug,
    busy,
    error,
    commit,
    remove,
    justUncovered,
    dismissUncovered,
    position,
    geoError,
    distances,
  }
  return <CommitmentsContext.Provider value={value}>{children}</CommitmentsContext.Provider>
}

export function useCommitments() {
  const ctx = useContext(CommitmentsContext)
  if (!ctx) throw new Error('useCommitments must be used inside CommitmentsProvider')
  return ctx
}
