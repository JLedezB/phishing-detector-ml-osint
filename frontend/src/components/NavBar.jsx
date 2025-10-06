// src/components/NavBar.jsx
export default function NavBar({ isLoggedIn, onLogout, user }) {
  return (
    <nav className="navbar navbar-expand-lg bg-dark navbar-dark">
      <div className="container">
        <a className="navbar-brand fw-bold" href="#/">
          Phishing Detector
        </a>

        <div className="ms-auto d-flex align-items-center">
          {!isLoggedIn ? (
            <>
              <a className="nav-link d-inline text-white" href="#/login">
                Login
              </a>
              <a className="nav-link d-inline text-white ms-3" href="#/register">
                Register
              </a>
            </>
          ) : (
            <>
              <a className="nav-link d-inline text-white" href="#/analyze">
                Analizar
              </a>
              <a className="nav-link d-inline text-white ms-3" href="#/history">
                Historial
              </a>

              {/* 🔐 Mostrar panel admin si el rol es admin */}
              {user?.role === "admin" && (
                <a className="nav-link d-inline text-warning ms-3" href="#/admin">
                  Panel Admin
                </a>
              )}

              {/* 👤 Mostrar usuario logueado */}
              {user && (
                <span className="text-white ms-4">
                  Bienvenido, <strong>{user.username}</strong> ({user.role})
                </span>
              )}

              <button
                onClick={onLogout}
                className="btn btn-sm btn-outline-light ms-3"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
