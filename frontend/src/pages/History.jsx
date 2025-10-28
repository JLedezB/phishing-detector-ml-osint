// ===========================================
// src/pages/History.jsx
// ===========================================
// Página principal de historial:
// - Carga historial de análisis
// - Permite importar correos desde Gmail
// - Muestra nombre derivado del JWT o correo Gmail vinculado
// - Permite desvincular Gmail correctamente
// - Totalmente comentado y sin reducción de código
// ===========================================

import { useEffect, useMemo, useState } from "react";
import {
  listEmails,
  getOSINT,
  osintScan,
  gmailFetch,
} from "../api"; // ✅ incluye Gmail
import LabelDistribution from "../components/LabelDistribution";
import TimelineChart from "../components/TimelineChart";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Swal from "sweetalert2";
import "leaflet/dist/leaflet.css";
import "sweetalert2/dist/sweetalert2.min.css";

export default function History() {
  // ==================================================
  // Estados base
  // ==================================================
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros de visualización
  const [filters, setFilters] = useState({
    phishing: true,
    sospechoso: true,
    legitimo: true,
  });
  const [query, setQuery] = useState("");

  // ==================================================
  // Gmail
  // ==================================================
  const [gmailEmails, setGmailEmails] = useState([]);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [gmailAccount, setGmailAccount] = useState(
    localStorage.getItem("gmail_email") || null
  );

  // ==================================================
  // OSINT
  // ==================================================
  const [selected, setSelected] = useState(null);
  const [osintData, setOsintData] = useState(null);
  const [loadingOsint, setLoadingOsint] = useState(false);

  // ==================================================
  // Usuario (JWT)
  // ==================================================
  const [userEmail, setUserEmail] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // ==================================================
  // Funciones auxiliares
  // ==================================================
  const capitalize = (s) =>
    s && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

  function nameFromEmail(emailOrUser) {
    if (!emailOrUser) return null;
    const angleMatch = emailOrUser.match(/<(.+?)>/);
    const plain = angleMatch ? angleMatch[1] : emailOrUser;
    const local = (plain.split("@")[0] || "").replace(/[\._\-\+]/g, " ");
    const parts = local.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    return parts.map(capitalize).join(" ");
  }

  function decodeJwtPayload(token) {
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }

  // ==================================================
  // Cargar usuario logeado
  // ==================================================
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    let email = null;
    let role = null;

    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        email = payload.sub || payload.username || payload.email || null;
        role = payload.role || null;
      }
    }

    if (!email) {
      const lsEmail =
        localStorage.getItem("user_email") || localStorage.getItem("username");
      if (lsEmail) email = lsEmail;
    }

    setUserEmail(email);
    setUserRole(role);
    setDisplayName(nameFromEmail(email) || "Usuario");
  }, []);

  // ==================================================
  // Consultar Gmail vinculado (desde backend)
  // ==================================================
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        const res = await fetch("http://127.0.0.1:8000/gmail/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json(); // {linked, email}
          if (data.linked && data.email) {
            localStorage.setItem("gmail_email", data.email);
            setGmailAccount(data.email);
          } else {
            localStorage.removeItem("gmail_email");
            setGmailAccount(null);
          }
        }
      } catch {
        setGmailAccount(null);
      }
    })();
  }, []);

  // ==================================================
  // Listener: evento postMessage del popup de Gmail
  // ==================================================
  useEffect(() => {
    function handleGmailMessage(event) {
      if (event.data?.type === "gmail_authenticated") {
        Swal.fire({
          icon: "success",
          title: "✅ Gmail vinculado",
          text: "Cuenta conectada correctamente.",
          timer: 2000,
          toast: true,
          position: "bottom-end",
          showConfirmButton: false,
        });
        setTimeout(() => window.location.reload(), 1500);
      }
    }
    window.addEventListener("message", handleGmailMessage);
    return () => window.removeEventListener("message", handleGmailMessage);
  }, []);

  // ==================================================
  // Cargar historial
  // ==================================================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await listEmails(limit);
        setItems(res.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  // ==================================================
  // Filtros
  // ==================================================
  const toggleLabel = (name) => {
    setFilters((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || []).filter((it) => {
      const lbl = it?.result?.label;
      if (!filters[lbl]) return false;
      if (!q) return true;
      const subj = (it?.email?.subject || "").toLowerCase();
      const sndr = (it?.email?.sender || "").toLowerCase();
      return subj.includes(q) || sndr.includes(q);
    });
  }, [items, filters, query]);

  const cleanedFiltered = useMemo(
    () => filtered.filter((it) => it.result?.label),
    [filtered]
  );

  const countShown = filtered.length;

  // ==================================================
  // Conexión Gmail
  // ==================================================
  const handleGmailConnect = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "⚠️ Sesión requerida",
        text: "Inicia sesión antes de vincular Gmail.",
        timer: 2500,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });
      return;
    }
    window.open(
      `http://127.0.0.1:8000/gmail/authorize?token=${encodeURIComponent(token)}`,
      "_blank",
      "width=600,height=800"
    );
  };

  // Desvincular Gmail
  const handleDisconnectGmail = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const res = await fetch("http://127.0.0.1:8000/gmail/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        localStorage.removeItem("gmail_email");
        setGmailAccount(null);
        Swal.fire({
          icon: "success",
          title: "📤 Gmail desvinculado",
          timer: 2000,
          toast: true,
          position: "bottom-end",
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==================================================
  // Fetch Gmail + análisis
  // ==================================================
  const handleFetchGmail = async () => {
    try {
      setLoadingGmail(true);
      const res = await gmailFetch();

      if (!res.emails || res.emails.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Sin correos nuevos",
          text: "No se encontraron correos en Gmail.",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "bottom-end",
        });
        return;
      }

      Swal.fire({
        icon: "info",
        title: "Analizando correos...",
        text: `${res.emails.length} correos importados.`,
        timer: 2500,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });

      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const analyzed = [];
      let processed = 0;

      for (const mail of res.emails) {
        try {
          const body = {
            subject: mail.subject,
            sender: mail.sender,
            body: mail.snippet || "",
          };

          const analyzeRes = await fetch("http://127.0.0.1:8000/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });

          if (!analyzeRes.ok) continue;

          const data = await analyzeRes.json();
          analyzed.push(data);
          processed++;
          console.log(`📧 Analizado ${processed}/${res.emails.length}: ${mail.subject}`);
        } catch (err) {
          console.error("Error analizando correo:", mail.subject, err);
        }
      }

      Swal.fire({
        icon: "success",
        title: "✅ Análisis completado",
        text: `${analyzed.length} correos procesados correctamente.`,
        timer: 2500,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });

      setItems((prev) => [...analyzed, ...prev]);
      setGmailEmails(res.emails);

      try {
        const updated = await listEmails(limit);
        if (updated && updated.items) {
          setItems(updated.items);
        }
      } catch {}

      Swal.fire({
        icon: "success",
        title: "📊 Historial actualizado",
        text: "Los nuevos correos analizados se han agregado correctamente.",
        timer: 2500,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "❌ Error al obtener correos",
        text: "No se pudieron recuperar correos desde Gmail.",
        timer: 3000,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });
    } finally {
      setLoadingGmail(false);
    }
  };

  // ==================================================
  // Ver / Enriquecer OSINT
  // ==================================================
  async function viewOsint(email) {
    setSelected(email);
    setOsintData(null);
    setLoadingOsint(true);
    try {
      const res = await getOSINT(email.analysis_id);
      setOsintData(res.osint || null);
    } catch {
      Swal.fire({
        icon: "warning",
        title: "⚠️ No disponible",
        text: "No se pudo obtener datos OSINT.",
        timer: 2500,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });
    } finally {
      setLoadingOsint(false);
    }
  }

  async function enrichOsint(email) {
    setSelected(email);
    setOsintData(null);
    setLoadingOsint(true);
    try {
      const res = await osintScan({
        analysis_id: email.analysis_id,
        urls: email.result?.indicators?.found_urls || [],
      });
      setOsintData(res.osint || null);
      Swal.fire({
        icon: "success",
        title: "✅ OSINT enriquecido",
        text: "Datos guardados correctamente.",
        timer: 2500,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "❌ Error OSINT",
        text: "No se pudo enriquecer datos.",
        timer: 3000,
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
      });
    } finally {
      setLoadingOsint(false);
    }
  }

  // ==================================================
  // Render principal
  // ==================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#010409",
        color: "#e6e6e6",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "#0d1117",
          borderRadius: "12px",
          padding: "30px",
          boxShadow: "0 0 20px rgba(0,180,216,0.25)",
          border: "1px solid #00b4d8",
        }}
      >
        {/* ===== HEADER ===== */}
        <div
          className="d-flex flex-wrap align-items-center justify-content-between mb-4"
          style={{ borderBottom: "1px solid #00b4d8", paddingBottom: "15px" }}
        >
          <h2 style={{ color: "#00b4d8", fontWeight: "600", marginBottom: "0" }}>
            Historial de Análisis
          </h2>

          {/* Mostrar nombre o Gmail vinculado */}
          <div className="d-flex align-items-center gap-3">
            <div style={{ color: "#9ba1a6", fontSize: 14 }}>
              {gmailAccount ? (
                <>
                  Gmail:{" "}
                  <strong style={{ color: "#00e0ff" }}>{gmailAccount}</strong>{" "}
                  <button
                    onClick={handleDisconnectGmail}
                    className="btn btn-outline-danger btn-sm ms-2"
                  >
                    Desvincular
                  </button>
                </>
              ) : displayName ? (
                <>
                  Bienvenido,{" "}
                  <strong style={{ color: "#d8f3ff" }}>{displayName}</strong>
                  {userRole && (
                    <span
                      style={{ marginLeft: 8, fontSize: 12, color: "#7fd3e6" }}
                    >
                      ({userRole})
                    </span>
                  )}
                </>
              ) : (
                <>Bienvenido</>
              )}
            </div>

            {/* Barra de búsqueda */}
            <div className="input-group input-group-sm" style={{ width: 260 }}>
              <span
                className="input-group-text"
                style={{
                  background: "#161b22",
                  color: "#9ba1a6",
                  border: "1px solid #30363d",
                }}
              >
                🔍
              </span>
              <input
                className="form-control"
                placeholder="Buscar asunto o remitente..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  background: "#161b22",
                  border: "1px solid #30363d",
                  color: "#e6e6e6",
                }}
              />
            </div>

            {/* Límite de registros */}
            <div className="d-flex align-items-center gap-2">
              <label className="text-muted small mb-0">Límite:</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-control form-control-sm"
                style={{
                  width: 80,
                  background: "#161b22",
                  color: "#e6e6e6",
                  border: "1px solid #30363d",
                }}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* ===== BLOQUE GMAIL ===== */}
        <div
          style={{
            background: "#0b1119",
            border: "1px solid #1e2a35",
            borderRadius: "8px",
            padding: "18px",
            marginBottom: "25px",
          }}
        >
          <h5 style={{ color: "#00b4d8", marginBottom: "12px" }}>
            📬 Importar correos desde Gmail
          </h5>
          <div className="d-flex flex-wrap gap-3 mb-3">
            <button
              className="btn btn-outline-info btn-sm"
              onClick={handleGmailConnect}
            >
              🔗 Conectar con Gmail
            </button>
            <button
              className="btn btn-outline-success btn-sm"
              onClick={handleFetchGmail}
              disabled={loadingGmail}
            >
              {loadingGmail
                ? "Analizando correos..."
                : "📥 Cargar y analizar Gmail"}
            </button>
          </div>

          {gmailEmails.length > 0 && (
            <div className="table-responsive">
              <table className="table table-dark table-hover table-sm mb-0">
                <thead style={{ background: "#132a3e", color: "#00b4d8" }}>
                  <tr>
                    <th>Asunto</th>
                    <th>Remitente</th>
                    <th>Vista previa</th>
                  </tr>
                </thead>
                <tbody>
                  {gmailEmails.map((mail, idx) => (
                    <tr key={idx}>
                      <td>{mail.subject}</td>
                      <td>{mail.sender}</td>
                      <td
                        className="text-muted small text-truncate"
                        style={{ maxWidth: 400 }}
                      >
                        {mail.snippet}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== FILTROS ===== */}
        <div
          style={{
            background: "#0b1119",
            border: "1px solid #1e2a35",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "25px",
          }}
        >
          <div className="d-flex flex-wrap align-items-center justify-content-between">
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <span className="text-muted me-1 small">Mostrar:</span>
              {["phishing", "sospechoso", "legitimo"].map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`btn btn-sm ${
                    filters[label]
                      ? label === "phishing"
                        ? "btn-danger"
                        : label === "sospechoso"
                        ? "btn-warning"
                        : "btn-success"
                      : `btn-outline-${
                          label === "phishing"
                            ? "danger"
                            : label === "sospechoso"
                            ? "warning"
                            : "success"
                        }`
                  }`}
                  onClick={() => toggleLabel(label)}
                >
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </button>
              ))}
            </div>

            <span className="text-muted small">
              Mostrando <strong>{countShown}</strong> resultado(s)
            </span>
          </div>
        </div>

        {/* ===== GRÁFICAS ===== */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card bg-dark border-info h-100 p-3">
              <h6 className="text-center text-muted mb-3">
                Distribución de etiquetas
              </h6>
              <LabelDistribution items={cleanedFiltered} />
            </div>
          </div>
          <div className="col-md-6">
            <div className="card bg-dark border-info h-100 p-3">
              <h6 className="text-center text-muted mb-3">
                Actividad en el tiempo
              </h6>
              <TimelineChart items={filtered} />
            </div>
          </div>
        </div>

        {/* ===== TABLA HISTORIAL ===== */}
        {!loading && !error && (
          <div className="table-responsive border border-info rounded">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead style={{ background: "#132a3e", color: "#00b4d8" }}>
                <tr>
                  <th className="text-center">Fecha</th>
                  <th>Asunto</th>
                  <th>Remitente</th>
                  <th className="text-center">Etiqueta</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((it) => (
                    <tr key={it.analysis_id}>
                      <td className="text-center">
                        {new Date(it.created_at).toLocaleString()}
                      </td>
                      <td>{it.email?.subject}</td>
                      <td>{it.email?.sender}</td>
                      <td className="text-center">
                        <span
                          className={`badge rounded-pill text-bg-${
                            it.result?.label === "phishing"
                              ? "danger"
                              : it.result?.label === "sospechoso"
                              ? "warning"
                              : "success"
                          }`}
                        >
                          {it.result?.label}
                        </span>
                      </td>
                      <td className="text-center fw-semibold">
                        {it.result?.risk_score}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => enrichOsint(it)}
                          disabled={
                            loadingOsint &&
                            selected?.analysis_id === it.analysis_id
                          }
                        >
                          {loadingOsint &&
                          selected?.analysis_id === it.analysis_id
                            ? "Cargando..."
                            : "🔍 Enriquecer OSINT"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      Sin registros que coincidan con los filtros o búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== DETALLE OSINT ===== */}
        {selected && osintData && (
          <div className="mt-4 p-3 border border-info rounded">
            <h5 className="text-info mb-3">
              Resultados OSINT — {selected.email?.subject}
            </h5>
            <div className="table-responsive">
              <table className="table table-dark table-sm align-middle">
                <thead style={{ background: "#132a3e", color: "#00b4d8" }}>
                  <tr>
                    <th>URL</th>
                    <th>Dominio</th>
                    <th>IP</th>
                    <th>País</th>
                    <th>ISP</th>
                    <th>Registrador</th>
                  </tr>
                </thead>
                <tbody>
                  {osintData.artifacts.map((a, i) => (
                    <tr key={i}>
                      <td className="text-truncate" style={{ maxWidth: 250 }}>
                        {a.url}
                      </td>
                      <td>{a.domain}</td>
                      <td>{a.ip || "-"}</td>
                      <td>{a.geo?.country || "-"}</td>
                      <td>{a.geo?.isp || "-"}</td>
                      <td>{a.whois?.registrar || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {osintData.artifacts.some((a) => a.geo?.lat && a.geo?.lon) && (
              <div
                style={{
                  width: "100%",
                  height: "400px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  marginTop: "20px",
                  border: "1px solid #00b4d8",
                }}
              >
                <MapContainer
                  center={[20, 0]}
                  zoom={2}
                  style={{ width: "100%", height: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {osintData.artifacts
                    .filter((a) => a.geo?.lat && a.geo?.lon)
                    .map((a, idx) => (
                      <Marker key={idx} position={[a.geo.lat, a.geo.lon]}>
                        <Popup>
                          <strong>{a.domain}</strong>
                          <br />
                          IP: {a.ip}
                          <br />
                          País: {a.geo?.country || "-"}
                          <br />
                          ISP: {a.geo?.isp || "-"}
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
