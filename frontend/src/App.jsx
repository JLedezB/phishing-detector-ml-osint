// src/App.jsx
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import NavBar from "./components/NavBar";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { getToken, clearToken } from "./api";

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "#/login");
  const [user, setUser] = useState(null);

  // Al iniciar, revisamos si hay token en localStorage y decodificamos
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ username: decoded.sub }); // "sub" es el campo que pusimos en el backend
      } catch (err) {
        console.error("Error decodificando token:", err);
        clearToken();
      }
    }
  }, []);

  // Escucha de cambios en hash (routing)
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#/login");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Logout: limpiar token y usuario
  function handleLogout() {
    clearToken();
    setUser(null);
    window.location.hash = "#/login";
  }

  // Selección de página
  let Page;
  if (!user) {
    if (route.startsWith("#/register")) {
      Page = <Register />;
    } else {
      Page = (
        <Login
          onLogin={(data) => {
            try {
              const decoded = jwtDecode(data.access_token);
              setUser({ username: decoded.sub });
            } catch {
              setUser({ username: "usuario" });
            }
          }}
        />
      );
    }
  } else {
    if (route.startsWith("#/history")) Page = <History />;
    else Page = <Analyze />;
  }

  return (
    <>
      <NavBar isLoggedIn={!!user} onLogout={handleLogout} user={user} />
      {Page}
      <footer className="text-center text-muted py-4">
        <small>Detector de Phishing — Proyecto de Titulación</small>
      </footer>
    </>
  );
}
