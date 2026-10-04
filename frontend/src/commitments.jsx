import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { API_BASE, useAuth } from './auth.jsx'

const CommitmentsContext = createContext(null)

export function CommitmentsProvider({ children }) {
  const { token, logout } = useAuth()
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

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

  const setStatus = useCallback(
    (id, status) =>
      run(async () => {
        const c = await request(`/commitments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
        setItems((prev) => prev.map((p) => (p.id === id ? c : p)))
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

  const bySlug = useMemo(() => Object.fromEntries(items.map((c) => [c.slug, c])), [items])

  const value = { items, bySlug, busy, error, commit, setStatus, remove }
  return <CommitmentsContext.Provider value={value}>{children}</CommitmentsContext.Provider>
}

export function useCommitments() {
  const ctx = useContext(CommitmentsContext)
  if (!ctx) throw new Error('useCommitments must be used inside CommitmentsProvider')
  return ctx
}
