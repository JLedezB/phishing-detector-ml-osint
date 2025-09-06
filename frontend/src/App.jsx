import { useEffect, useState } from 'react'
import NavBar from './components/NavBar'
import Analyze from './pages/Analyze'
import History from './pages/History'

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/analyze')

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/analyze')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  let Page = Analyze
  if (route.startsWith('#/history')) Page = History

  return (
    <>
      <NavBar />
      <Page />
      <footer className="text-center text-muted py-4">
        <small>Detector de Phishing — Proyecto de Titulación</small>
      </footer>
    </>
  )
}
