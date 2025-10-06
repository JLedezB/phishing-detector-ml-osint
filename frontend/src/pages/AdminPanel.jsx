// src/pages/AdminPanel.jsx
import { useEffect, useState } from "react";
import {
  adminListUsers,
  adminDeleteUser,
  adminListAllEmails,
} from "../api";
import AdminTable from "../components/AdminTable";

export default function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState("emails");
  const [emails, setEmails] = useState([]);
  const [users, setUsers] = useState([]);

  // Cargar datos al inicio
  useEffect(() => {
    if (activeTab === "emails") {
      loadEmails();
    } else {
      loadUsers();
    }
  }, [activeTab]);

  async function loadEmails() {
    try {
      const data = await adminListAllEmails();
      setEmails(data.items || []);
    } catch (err) {
      console.error("Error cargando correos globales:", err);
    }
  }

  async function loadUsers() {
    try {
      const data = await adminListUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  }

  async function handleDeleteUser(username) {
    if (!window.confirm(`¿Eliminar usuario "${username}"?`)) return;
    try {
      await adminDeleteUser(username);
      setUsers(users.filter((u) => u.username !== username));
    } catch (err) {
      alert("❌ Error al eliminar usuario.");
    }
  }

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">
        👑 Panel de Administración
      </h2>
      <p className="text-center">
        Bienvenido, <strong>{user.username}</strong>. Rol:{" "}
        <span className="text-warning">{user.role}</span>
      </p>

      <div className="d-flex justify-content-center mb-4">
        <button
          className={`btn me-3 ${
            activeTab === "emails" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setActiveTab("emails")}
        >
          📧 Historial Global
        </button>
        <button
          className={`btn ${
            activeTab === "users" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setActiveTab("users")}
        >
          👥 Gestionar Usuarios
        </button>
      </div>

      {activeTab === "emails" ? (
        <AdminTable
          title="Historial Global de Correos Analizados"
          columns={["Usuario", "Asunto", "Etiqueta", "Fecha"]}
          data={emails.map((e) => ({
            Usuario: e.owner,
            Asunto: e.subject,
            Etiqueta: e.label,
            Fecha: new Date(e.created_at).toLocaleString(),
          }))}
        />
      ) : (
        <AdminTable
          title="Gestión de Usuarios"
          columns={["Usuario", "Rol", "Acciones"]}
          data={users.map((u) => ({
            Usuario: u.username,
            Rol: u.role,
            Acciones: (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDeleteUser(u.username)}
              >
                Eliminar
              </button>
            ),
          }))}
        />
      )}

      <div className="text-center mt-4">
        <small className="text-muted">
         
        </small>
      </div>
    </div>
  );
}
