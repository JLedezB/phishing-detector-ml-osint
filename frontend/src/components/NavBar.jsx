// src/components/NavBar.jsx
export default function NavBar({ isLoggedIn, onLogout, user }) {
  const navStyle = {
    backgroundColor: "#0d1117",
    borderBottom: "1px solid #00b4d8",
    boxShadow: "0 2px 8px rgba(0, 180, 216, 0.2)",
  };

  const linkStyle = {
    color: "#e6e6e6",
    textDecoration: "none",
    fontWeight: "500",
    transition: "color 0.2s ease",
  };

  const linkHover = {
    color: "#00b4d8",
  };

  return (
    <nav className="navbar navbar-expand-lg" style={navStyle}>
      <div className="container">
        {/* === Logo / Marca === */}
        <a
          className="navbar-brand fw-bold"
          href="#/"
          style={{
            color: "#00b4d8",
            fontSize: "1.3rem",
            letterSpacing: "0.5px",
          }}
        >
          Phishing Detector
        </a>

        {/* === Contenido dinámico según login === */}
        <div className="ms-auto d-flex align-items-center">
          {!isLoggedIn ? (
            <>
              <a
                className="nav-link"
                href="#/login"
                style={linkStyle}
                onMouseOver={(e) => (e.target.style.color = linkHover.color)}
                onMouseOut={(e) => (e.target.style.color = linkStyle.color)}
              >
                Iniciar sesión
              </a>
              <a
                className="nav-link ms-3"
                href="#/register"
                style={linkStyle}
                onMouseOver={(e) => (e.target.style.color = linkHover.color)}
                onMouseOut={(e) => (e.target.style.color = linkStyle.color)}
              >
                Registrarse
              </a>
            </>
          ) : (
            <>
              {user?.role === "admin" ? (
                <>
                  <a
                    className="nav-link text-warning fw-semibold"
                    href="#/admin"
                    style={{
                      color: "#f0ad4e",
                      fontWeight: "600",
                      textDecoration: "none",
                    }}
                  >
                    Panel Administrativo
                  </a>
                  <a
                    className="nav-link ms-3"
                    href="#/osint-dashboard"
                    style={linkStyle}
                    onMouseOver={(e) => (e.target.style.color = linkHover.color)}
                    onMouseOut={(e) => (e.target.style.color = linkStyle.color)}
                  >
                    OSINT Dashboard
                  </a>
                </>
              ) : (
                <>
                  <a
                    className="nav-link"
                    href="#/analyze"
                    style={linkStyle}
                    onMouseOver={(e) => (e.target.style.color = linkHover.color)}
                    onMouseOut={(e) => (e.target.style.color = linkStyle.color)}
                  >
                    Analizar
                  </a>
                  <a
                    className="nav-link ms-3"
                    href="#/history"
                    style={linkStyle}
                    onMouseOver={(e) => (e.target.style.color = linkHover.color)}
                    onMouseOut={(e) => (e.target.style.color = linkStyle.color)}
                  >
                    Historial
                  </a>
                  <a
                    className="nav-link ms-3"
                    href="#/osint-dashboard"
                    style={linkStyle}
                    onMouseOver={(e) => (e.target.style.color = linkHover.color)}
                    onMouseOut={(e) => (e.target.style.color = linkStyle.color)}
                  >
                    OSINT Dashboard
                  </a>
                </>
              )}

              {/* Usuario actual */}
              {user && (
                <span
                  className="ms-4 small"
                  style={{
                    color: "#9ba1a6",
                    fontSize: "0.9rem",
                    borderLeft: "1px solid #2c2f33",
                    paddingLeft: "12px",
                  }}
                >
                  Bienvenido,{" "}
                  <strong style={{ color: "#e6e6e6" }}>
                    {user.username}
                  </strong>{" "}
                  ({user.role})
                </span>
              )}

              {/* Botón Logout */}
              <button
                onClick={onLogout}
                className="btn btn-sm ms-3"
                style={{
                  backgroundColor: "transparent",
                  color: "#00b4d8",
                  border: "1px solid #00b4d8",
                  borderRadius: "6px",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#00b4d8";
                  e.target.style.color = "#fff";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#00b4d8";
                }}
              >
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
