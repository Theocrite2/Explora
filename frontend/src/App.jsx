import React, { useState } from 'react'
import MapBackground from './components/MapBackground'
import Navbar from './components/Navbar'
import InfoSection from './components/InfoSection'
import AuthModal from './components/AuthModal'

export default function App() {
  const [modalMode, setModalMode] = useState(null) // null | "login" | "signup"

  const openLogin = () => setModalMode('login')
  const openSignup = () => setModalMode('signup')
  const closeModal = () => setModalMode(null)

  return (
    <>
      {/* Fixed world map background — z-index: 0 */}
      <MapBackground />

      {/* Fixed navigation */}
      <Navbar onLoginClick={openLogin} onSignupClick={openSignup} />

      {/* Scrollable content */}
      <main className="relative min-h-screen">
        <InfoSection />
      </main>

      {/* Auth modal — rendered conditionally */}
      {modalMode && (
        <AuthModal mode={modalMode} onClose={closeModal} />
      )}
    </>
  )
}
