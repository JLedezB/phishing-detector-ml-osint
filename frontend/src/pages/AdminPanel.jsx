// src/pages/AdminPanel.jsx
import { useEffect, useState } from "react";
import {
  adminListUsers,
  adminDeleteUser,
  adminListAllEmails,
  getMLInfo,
  getMLMetrics,
  adminExportMLReport,
} from "../api";
import AdminTable from "../components/AdminTable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState("emails");
  const [emails, setEmails] = useState([]);
  const [users, setUsers] = useState([]);
  const [mlInfo, setMlInfo] = useState(null);
  const [mlMetrics, setMlMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadML();
    loadMetrics();
    if (activeTab === "emails") loadEmails();
    else loadUsers();
  }, [activeTab]);

  // === Cargar información del modelo ===
  async function loadML() {
    try {
      const info = await getMLInfo();
      setMlInfo(info);
    } catch (err) {
      console.error("Error obteniendo info ML:", err);
    }
  }

  async function loadMetrics() {
    try {
      const data = await getMLMetrics();
      setMlMetrics(data);
    } catch (err) {
      console.error("Error obteniendo métricas ML:", err);
    }
  }

  async function loadEmails() {
    try {
      const data = await adminListAllEmails();
      setEmails(data.items || []);
      generateChartData(data.items || []);
    } catch (err) {
      console.error("Error cargando correos:", err);
    }
  }

  async function loadUsers() {
    try {
      const data = await adminListUsers();
      setUsers(data.users || data || []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  }

  // === Generar datos para gráfica ===
  function generateChartData(items) {
    const counts = { legitimo: 0, sospechoso: 0, phishing: 0 };
    for (const e of items) counts[e.label] = (counts[e.label] || 0) + 1;
    const total = items.length || 1;
    setChartData([
      { tipo: "Legítimos", Porcentaje: ((counts.legitimo / total) * 100).toFixed(1) },
      { tipo: "Sospechosos", Porcentaje: ((counts.sospechoso / total) * 100).toFixed(1) },
      { tipo: "Phishing", Porcentaje: ((counts.phishing / total) * 100).toFixed(1) },
    ]);
  }

  // === Eliminar usuario ===
  async function handleDeleteUser(username) {
    if (!window.confirm(`¿Eliminar usuario "${username}"?`)) return;
    try {
      await adminDeleteUser(username);
      setUsers(users.filter((u) => u.username !== username));
    } catch {
      alert("Error al eliminar usuario.");
    }
  }

  // === Render principal ===
  return (
    <div
      className="container-fluid py-4"
      style={{ backgroundColor: "#0b1119", color: "#e6e6e6", minHeight: "100vh" }}
    >
      {/* ===== ENCABEZADO ===== */}
      <div className="text-center mb-5">
        <h2 className="fw-bold text-info mb-2">Panel de Administración</h2>
        <p className="text-muted mb-1">
          Bienvenido, <strong>{user.username}</strong> — Rol:{" "}
          <span className="badge bg-warning text-dark">{user.role}</span>
        </p>
        {mlInfo && (
          <p className="text-secondary small mb-0">
            Modelo activo: <strong>{mlInfo.name}</strong> v{mlInfo.version} —{" "}
            <em>{mlInfo.mode}</em>
          </p>
        )}
      </div>

      {/* ===== MÉTRICAS DEL MODELO ML ===== */}
      {mlMetrics && (
        <div
          className="card shadow-sm mb-4 border-0"
          style={{ backgroundColor: "#101820", border: "1px solid #1e2a35" }}
        >
          <div className="card-body text-center">
            <h5 className="fw-semibold text-info mb-4">
              Rendimiento del Modelo ML
            </h5>

            <div className="row g-3">
              {[
                ["Accuracy", mlMetrics.accuracy],
                ["Precision", mlMetrics.precision],
                ["Recall", mlMetrics.recall],
                ["F1-Score", mlMetrics.f1_score],
              ].map(([label, value]) => (
                <div className="col-6 col-md-3" key={label}>
                  <div
                    className="p-3 rounded border text-center"
                    style={{
                      backgroundColor: "#161b22",
                      border: "1px solid #2a2f36",
                    }}
                  >
                    <h6 className="text-muted mb-1">{label}</h6>
                    <h5 className="fw-bold text-info mb-0">
                      {(value * 100).toFixed(1)}%
                    </h5>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-muted mt-3 small">
              Muestras: <strong>{mlMetrics.samples}</strong> — Fuente:{" "}
              <em>{mlMetrics.source}</em>
            </p>
          </div>
        </div>
      )}

      {/* ===== REPORTES Y GRÁFICA ===== */}
      <div className="row mb-4 align-items-center">
        <div className="col-md-6">
          <button
            className="btn btn-outline-info btn-sm shadow-sm"
            onClick={adminExportMLReport}
          >
            Exportar Reporte ML (CSV)
          </button>
        </div>
      </div>

      {chartData.length > 0 && (
        <div
          className="card shadow-sm mb-5 border-0"
          style={{ backgroundColor: "#101820", border: "1px solid #1e2a35" }}
        >
          <div className="card-body">
            <h5 className="text-center fw-semibold text-info mb-3">
              Distribución de Clasificaciones
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f36" />
                <XAxis dataKey="tipo" stroke="#9ba1a6" />
                <YAxis stroke="#9ba1a6" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161b22",
                    border: "1px solid #30363d",
                    borderRadius: "6px",
                    color: "#e6e6e6",
                  }}
                />
                <Legend wrapperStyle={{ color: "#9ba1a6" }} />
                <Bar dataKey="Porcentaje" fill="#00b4d8" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ===== NAVEGACIÓN ENTRE TABS ===== */}
      <ul className="nav nav-pills justify-content-center mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${
              activeTab === "emails" ? "active bg-info text-dark" : "text-light"
            }`}
            onClick={() => setActiveTab("emails")}
          >
            Historial Global
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${
              activeTab === "users" ? "active bg-info text-dark" : "text-light"
            }`}
            onClick={() => setActiveTab("users")}
          >
            Gestión de Usuarios
          </button>
        </li>
      </ul>

      {/* ===== CONTENIDO DE TABS ===== */}
      <div
        className="card shadow-sm border-0 p-3"
        style={{ backgroundColor: "#101820", border: "1px solid #1e2a35" }}
      >
        {activeTab === "emails" ? (
          <AdminTable
            title="Historial Global de Correos Analizados"
            columns={["Usuario", "Asunto", "Etiqueta", "Fecha"]}
            data={emails.map((e) => ({
              Usuario: e.owner,
              Asunto: e.subject,
              Etiqueta: (
                <span
                  className={`badge text-bg-${
                    e.label === "phishing"
                      ? "danger"
                      : e.label === "sospechoso"
                      ? "warning"
                      : "success"
                  }`}
                >
                  {e.label}
                </span>
              ),
              Fecha: new Date(e.created_at).toLocaleString(),
            }))}
          />
        ) : (
          <AdminTable
            title="Gestión de Usuarios"
            columns={["Usuario", "Rol", "Acciones"]}
            data={users.map((u) => ({
              Usuario: u.username,
              Rol: (
                <span
                  className={`badge ${
                    u.role === "admin"
                      ? "bg-warning text-dark"
                      : "bg-secondary"
                  }`}
                >
                  {u.role}
                </span>
              ),
              Acciones: (
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDeleteUser(u.username)}
                >
                  Eliminar
                </button>
              ),
            }))}
          />
        )}
      </div>
    </div>
  );
}
