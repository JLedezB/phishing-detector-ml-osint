export default function NavBar() {
  return (
    <nav className="navbar navbar-expand-lg bg-dark navbar-dark">
      <div className="container">
        <a className="navbar-brand fw-bold" href="#">Phishing Detector</a>
        <div className="ms-auto">
          <a className="nav-link d-inline text-white" href="#/analyze">Analizar</a>
          <a className="nav-link d-inline text-white ms-3" href="#/history">Historial</a>
        </div>
      </div>
    </nav>
  )
}
