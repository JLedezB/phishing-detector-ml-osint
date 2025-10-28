// ===========================================
// src/App.jsx (versión corregida)
// ===========================================
// Muestra la Landing Page por defecto si no hay sesión
// ===========================================

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPanel from "./pages/AdminPanel";
import OsintDashboard from "./pages/OsintDashboard";
import Landing from "./pages/Landing"; // ✅ Landing integrada
import { getToken, clearToken } from "./api";

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  const [user, setUser] = useState(null);

  // ✅ Verificar token almacenado
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          username: decoded.sub,
          role: decoded.role || "user",
        });
      } catch (err) {
        console.error("Error al decodificar el token:", err);
        clearToken();
      }
    }
  }, []);

  // ✅ Escuchar cambios de hash
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || "#/";
      setRoute(newHash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // ✅ Redirigir a Landing si no hay hash ni token al cargar
  useEffect(() => {
    const token = getToken();
    const hash = window.location.hash;
    if (!token && (!hash || hash === "" || hash === "#")) {
      window.location.hash = "#/"; // fuerza la landing
      setRoute("#/");
    }
  }, []);

  // ✅ Cerrar sesión
function handleLogout() {
  clearToken();
  setUser(null);
  window.location.hash = "#/"; // Redirige al landing
}


  // ✅ Selección de página
  let Page;
  if (!user) {
    if (route === "#/" || route === "" || route === "#") {
      Page = <Landing />; // 🏠 Landing sin sesión
    } else if (route.startsWith("#/register")) {
      Page = <Register />;
    } else {
      Page = (
        <Login
          onLogin={(data) => {
            try {
              const decoded = jwtDecode(data.access_token);
              const loggedUser = {
                username: decoded.sub,
                role: decoded.role || "user",
              };
              setUser(loggedUser);

              // 🚀 Redirección según rol
              if (loggedUser.role === "admin") {
                window.location.hash = "#/admin";
              } else {
                window.location.hash = "#/analyze";
              }
            } catch {
              setUser({ username: "usuario", role: "user" });
              window.location.hash = "#/analyze";
            }
          }}
        />
      );
    }
  } else {
    if (route.startsWith("#/history")) {
      Page = <History />;
    } else if (route.startsWith("#/admin") && user.role === "admin") {
      Page = <AdminPanel user={user} />;
    } else if (route.startsWith("#/osint-dashboard")) {
      Page = <OsintDashboard />;
    } else {
      Page = <Analyze />;
    }
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-light">
      <NavBar isLoggedIn={!!user} onLogout={handleLogout} user={user} />
      <main className="flex-grow-1">{Page}</main>
      <Footer />
    </div>
  );
}
