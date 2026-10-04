import React, { useState } from 'react'
import MapBackground from './components/MapBackground'
import Navbar from './components/Navbar'
import InfoSection from './components/InfoSection'
import AuthModal from './components/AuthModal'
import WorldMap from './components/WorldMap'

export default function App() {
  const [modalMode, setModalMode] = useState(null) // null | "login" | "signup"
  const [view, setView] = useState('landing') // "landing" | "world"

  const openLogin = () => setModalMode('login')
  const openSignup = () => setModalMode('signup')
  const closeModal = () => setModalMode(null)

  return (
    <>
      {/* Fixed world map background — z-index: 0 */}
      {view === 'landing' && <MapBackground />}

      {/* Fixed navigation */}
      <Navbar onLoginClick={openLogin} onSignupClick={openSignup} />

      {view === 'landing' ? (
        /* Scrollable content */
        <main className="relative min-h-screen">
          <InfoSection onEnterWorld={() => setView('world')} />
        </main>
      ) : (
        <WorldMap onExit={() => setView('landing')} />
      )}

      {/* Auth modal — rendered conditionally */}
      {modalMode && (
        <AuthModal mode={modalMode} onClose={closeModal} onSwitchMode={setModalMode} />
      )}
    </>
  )
}
