import React, { createContext, useContext, useState, useCallback } from 'react'

export const API_BASE = 'https://explora-production-b6ef.up.railway.app/api'

const STORAGE_KEY = 'explora_auth'
const AuthContext = createContext(null)

// True when the JWT's exp claim is in the past (or the token is unreadable).
function isExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.token && !isExpired(parsed.token)) return parsed
    if (parsed) window.localStorage.removeItem(STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

function writeStored(value) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable (private mode, blocked): session lives in memory only
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored)

  const saveSession = useCallback((data, fallbackName) => {
    const session = {
      token: data.access_token,
      user: {
        id: data.user_id,
        username: data.username || fallbackName,
        isAdmin: !!data.is_admin,
      },
    }
    writeStored(session)
    setAuth(session)
  }, [])

  const logout = useCallback(() => {
    writeStored(null)
    setAuth(null)
  }, [])

  const value = {
    user: auth ? auth.user : null,
    token: auth ? auth.token : null,
    saveSession,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
