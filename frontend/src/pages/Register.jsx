import { useState } from "react";
import { register } from "../api";

export default function Register({ onRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await register(username, password, role);
      setSuccess(`Usuario ${role} registrado correctamente. Ahora puedes iniciar sesión.`);
      if (onRegister) onRegister(data);
    } catch {
      setError("Error al registrar usuario. Intenta con otro nombre o revisa la conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: "#0b1119",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#e6e6e6",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#101820",
          border: "1px solid #1e2a35",
          borderRadius: "14px",
          boxShadow: "0 0 25px rgba(0,180,216,0.1)",
          padding: "32px",
        }}
      >
        {/* ===== HEADER ===== */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h2
            style={{
              color: "#00c853",
              fontWeight: "700",
              letterSpacing: "0.5px",
              marginBottom: "5px",
            }}
          >
            Registro de Usuario
          </h2>
          <p style={{ color: "#9ba1a6", fontSize: "0.9rem" }}>
            Crea tu cuenta para acceder al sistema de análisis de correos.
          </p>
        </div>

        {/* ===== FORM ===== */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                backgroundColor: "#3d0c0c",
                border: "1px solid #ff4d4d",
                color: "#ffb3b3",
                borderRadius: "8px",
                textAlign: "center",
                fontWeight: "600",
                padding: "8px",
                marginBottom: "12px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                backgroundColor: "#103e2e",
                border: "1px solid #00c853",
                color: "#b7ffcf",
                borderRadius: "8px",
                textAlign: "center",
                fontWeight: "600",
                padding: "8px",
                marginBottom: "12px",
              }}
            >
              {success}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                color: "#9ba1a6",
                marginBottom: "6px",
              }}
            >
              Usuario
            </label>
            <input
              type="text"
              placeholder="Ej. juanperez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #2a2f36",
                backgroundColor: "#0f1622",
                color: "#e6e6e6",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                color: "#9ba1a6",
                marginBottom: "6px",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #2a2f36",
                backgroundColor: "#0f1622",
                color: "#e6e6e6",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                color: "#9ba1a6",
                marginBottom: "6px",
              }}
            >
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #2a2f36",
                backgroundColor: "#0f1622",
                color: "#e6e6e6",
                outline: "none",
              }}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
            <small style={{ color: "#777", fontSize: "0.8rem" }}>
              * Solo los <strong>Administradores</strong> pueden acceder al panel global.
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#00c853",
              color: "#0b1119",
              fontWeight: "600",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 0 10px rgba(0,200,83,0.3)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "0 0 14px rgba(0,200,83,0.6)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow = "0 0 10px rgba(0,200,83,0.3)")
            }
          >
            {loading ? "Registrando..." : "Registrar Usuario"}
          </button>
        </form>

        {/* ===== FOOTER ===== */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p style={{ color: "#9ba1a6", fontSize: "0.9rem" }}>
            ¿Ya tienes una cuenta?{" "}
            <a
              href="#/login"
              style={{
                color: "#00b4d8",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
