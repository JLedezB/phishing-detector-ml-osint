import { useState } from "react";
import { login, register, setToken } from "../api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" o "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (mode === "register") {
        const data = await register(username, password);
        setSuccess("✅ Usuario registrado, ahora puedes iniciar sesión.");
        setMode("login");
      } else {
        const data = await login(username, password);
        if (data?.access_token) {
          setToken(data.access_token);
          if (onLogin) onLogin(data);
        }
      }
    } catch (err) {
      setError("❌ Error en " + mode);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mt-5" style={{ maxWidth: "400px" }}>
      <h2 className="text-center mb-4">
        {mode === "login" ? "Iniciar Sesión" : "Registrarse"}
      </h2>
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="mb-3">
          <label className="form-label">Usuario</label>
          <input
            type="text"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
        >
          {loading
            ? mode === "login"
              ? "Ingresando..."
              : "Registrando..."
            : mode === "login"
            ? "Entrar"
            : "Crear cuenta"}
        </button>

        <div className="text-center mt-3">
          {mode === "login" ? (
            <span>
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => setMode("register")}
              >
                Regístrate
              </button>
            </span>
          ) : (
            <span>
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => setMode("login")}
              >
                Inicia sesión
              </button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
