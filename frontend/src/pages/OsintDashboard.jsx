// src/pages/OsintDashboard.jsx
import { useState, useEffect } from "react";
import { getOsintSummary } from "../api";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// === Colores para los gráficos ===
const COLORS = ["#dc3545", "#ffc107", "#198754", "#0dcaf0", "#6f42c1"];

export default function OsintDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState(null);

  // === Cargar datos OSINT ===
  useEffect(() => {
    async function loadData() {
      try {
        const res = await getOsintSummary();
        setData(res);
      } catch (err) {
        console.error("Error al obtener datos OSINT:", err);
        setError("No se pudieron cargar los datos del Dashboard OSINT.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // === Estados de carga y error ===
  if (loading)
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">Cargando Dashboard...</p>
      </div>
    );

  if (error)
    return (
      <div className="alert alert-danger text-center my-5">{error}</div>
    );

  if (!data)
    return (
      <div className="alert alert-warning text-center my-5">
        No hay datos OSINT disponibles todavía.
      </div>
    );

  // === Desestructurar datos ===
  const mapPoints = data.map_points || [];
  const topCountries = data.top_countries || [];
  const riskStats = data.risk_stats || [];
  const topDomains = data.top_domains || [];

  // === Configuración del mapa ===
  const tileUrl = darkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution = darkMode
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : "&copy; OpenStreetMap contributors";

  // === Render principal ===
  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#0b1119", color: "#e6e6e6", minHeight: "100vh" }}>
      
      {/* ===== ENCABEZADO ===== */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h3 className="fw-bold text-info mb-0">OSINT Dashboard</h3>
          <p className="text-muted mb-0 small">
            Resumen global de inteligencia de dominios y amenazas detectadas
          </p>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            checked={darkMode}
            onChange={toggleDarkMode}
          />
          <label className="form-check-label small text-muted">
            Modo oscuro del mapa
          </label>
        </div>
      </div>

      {/* ===== MÉTRICAS PRINCIPALES ===== */}
      <div className="row g-3 mb-4">
        {[
          { title: "Países detectados", value: data.countries_count },
          { title: "Dominios únicos", value: data.domains_count },
          { title: "Maliciosos detectados", value: data.malicious_total, color: "#dc3545" },
          { title: "Reputación promedio", value: data.avg_reputation },
        ].map((metric, i) => (
          <div className="col-md-3" key={i}>
            <div
              className="card h-100 shadow-sm border-0 text-center"
              style={{
                backgroundColor: "#101820",
                border: "1px solid #1e2a35",
              }}
            >
              <div className="card-body">
                <h6 className="text-secondary mb-1">{metric.title}</h6>
                <h3 style={{ color: metric.color || "#00b4d8" }}>{metric.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== MAPA DE ACTIVIDAD ===== */}
      <div
        className="shadow-sm mb-5"
        style={{
          width: "100%",
          height: "420px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #1e2a35",
        }}
      >
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
          <TileLayer url={tileUrl} attribution={tileAttribution} />
          {mapPoints.map((p, idx) => (
            <CircleMarker
              key={idx}
              center={[p.lat, p.lon]}
              radius={6}
              color={p.color || "#ff4d4d"}
              fillOpacity={0.7}
            >
              <Tooltip>
                <div>
                  <strong>{p.domain}</strong>
                  <br />
                  País: {p.country || "N/A"}
                  <br />
                  Riesgo: {p.risk}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* ===== GRÁFICOS ===== */}
      <div className="row g-4">
        {/* === Gráfico de países === */}
        <div className="col-md-6">
          <div
            className="card shadow-sm border-0 h-100"
            style={{ backgroundColor: "#101820", border: "1px solid #1e2a35" }}
          >
            <div className="card-body">
              <h5 className="fw-semibold text-info text-center mb-3">
                Países con mayor actividad
              </h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCountries}>
                  <XAxis dataKey="country" stroke="#9ba1a6" />
                  <YAxis stroke="#9ba1a6" />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                      color: "#e6e6e6",
                      fontSize: "0.85rem",
                    }}
                  />
                  <Bar dataKey="count" fill="#00b4d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* === Gráfico de riesgos === */}
        <div className="col-md-6">
          <div
            className="card shadow-sm border-0 h-100"
            style={{ backgroundColor: "#101820", border: "1px solid #1e2a35" }}
          >
            <div className="card-body">
              <h5 className="fw-semibold text-info text-center mb-3">
                Distribución de Tipos de Riesgo
              </h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskStats}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {riskStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ color: "#9ba1a6" }} />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                      color: "#e6e6e6",
                      fontSize: "0.85rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABLA DE DOMINIOS ===== */}
      <div
        className="card shadow-sm border-0 mt-5"
        style={{ backgroundColor: "#101820", border: "1px solid #1e2a35" }}
      >
        <div className="card-body">
          <h5 className="fw-semibold text-info mb-3">
            Dominios más detectados
          </h5>
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead>
                <tr className="text-info">
                  <th>Dominio</th>
                  <th>País</th>
                  <th>Riesgo</th>
                  <th>Detecciones</th>
                </tr>
              </thead>
              <tbody>
                {topDomains.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-4">
                      No hay dominios registrados aún.
                    </td>
                  </tr>
                ) : (
                  topDomains.map((d, i) => (
                    <tr key={i}>
                      <td>{d.domain}</td>
                      <td>{d.country || "-"}</td>
                      <td
                        style={{
                          color:
                            d.risk === "high"
                              ? "#dc3545"
                              : d.risk === "medium"
                              ? "#ffc107"
                              : "#198754",
                        }}
                      >
                        {d.risk}
                      </td>
                      <td className="fw-semibold">{d.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
