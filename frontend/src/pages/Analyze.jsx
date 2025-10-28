// src/pages/Analyze.jsx
import { useState, useEffect, useMemo } from "react";
import { analyzeEmail, getMLInfo, osintScan } from "../api";
import ResultCard from "../components/ResultCard";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ===================== MAPA ===================== */
function MapController({ markers, darkMode, toggleDarkMode }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      if (markers.length > 0) {
        const bounds = markers.map((m) => [m.lat, m.lon]);
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
      } else {
        map.setView([20, 0], 2);
      }
    }, 200);
  }, [map, markers]);

  const recenter = () => {
    if (markers.length > 0) {
      const bounds = markers.map((m) => [m.lat, m.lon]);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
    }
  };

  return (
    <>
      <button
        onClick={recenter}
        title="Centrar mapa"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "#0d1117",
          border: "1px solid #00b4d8",
          color: "#00b4d8",
          borderRadius: "6px",
          width: "42px",
          height: "42px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          boxShadow: "0 0 8px rgba(0,180,216,0.4)",
          zIndex: 1000,
        }}
      >
        ↻
      </button>

      <label
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "#0d1117",
          border: "1px solid #00b4d8",
          borderRadius: "6px",
          padding: "5px 10px",
          fontSize: "12px",
          color: "#00b4d8",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        Dark
        <input
          type="checkbox"
          checked={darkMode}
          onChange={toggleDarkMode}
          style={{ marginLeft: "6px" }}
        />
      </label>
    </>
  );
}

/* ===================== OSINT ===================== */
function OSINTView({ analysisId, urls }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [cached, setCached] = useState(false);

  async function runScan() {
    setLoading(true);
    try {
      const res = await osintScan({ analysis_id: analysisId, urls });
      setData(res.osint);
      setCached(!!res.cached);
    } catch {
      alert("Error al realizar el análisis OSINT");
    } finally {
      setLoading(false);
    }
  }

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const markers = useMemo(
    () =>
      (data?.artifacts || [])
        .filter((a) => a.geo?.lat && a.geo?.lon)
        .map((a) => ({ ...a, lat: a.geo.lat, lon: a.geo.lon })),
    [data]
  );

  const tileUrl = darkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution = darkMode
    ? '&copy; CARTO | Datos © OpenStreetMap'
    : "&copy; OpenStreetMap contributors";

  const renderVT = (vt, domain) => {
    if (!vt) return "-";
    const risk =
      vt.malicious > 0
        ? "Malicioso"
        : vt.suspicious > 0
        ? "Sospechoso"
        : "Limpio";
    const color =
      risk === "Malicioso"
        ? "text-danger"
        : risk === "Sospechoso"
        ? "text-warning"
        : "text-success";
    const vtUrl = `https://www.virustotal.com/gui/domain/${domain}`;
    return (
      <div>
        <span className={color}>{risk}</span>
        <a
          href={vtUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: "12px",
            marginLeft: "4px",
            color: "#00b4d8",
            textDecoration: "none",
          }}
        >
          Ver reporte
        </a>
      </div>
    );
  };

  return (
    <div
      style={{
        background: "#0d1117",
        color: "#e6e6e6",
        borderRadius: "10px",
        padding: "20px",
        boxShadow: "0 0 12px rgba(0,180,216,0.3)",
        border: "1px solid #00b4d8",
        marginTop: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h5 style={{ margin: 0, color: "#00b4d8" }}>
          Análisis OSINT (VirusTotal, PhishTank, OpenPhish)
        </h5>
        <button
          onClick={runScan}
          disabled={loading}
          style={{
            background: "none",
            color: "#00b4d8",
            border: "1px solid #00b4d8",
            padding: "5px 12px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {loading ? "Analizando..." : "Ejecutar Análisis"}
        </button>
      </div>

      {cached && (
        <div
          style={{
            background: "#132a3e",
            color: "#80ffea",
            padding: "8px",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "10px",
          }}
        >
          Resultado obtenido desde caché (últimas 24h)
        </div>
      )}

      {data && (
        <>
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table
              className="table table-sm table-dark align-middle"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#dcdcdc",
              }}
            >
              <thead
                style={{
                  background: "#132a3e",
                  color: "#00b4d8",
                  borderBottom: "1px solid #00b4d8",
                }}
              >
                <tr>
                  <th>URL</th>
                  <th>Dominio</th>
                  <th>IP</th>
                  <th>País</th>
                  <th>ISP</th>
                  <th>Registrador</th>
                  <th>VirusTotal</th>
                  <th>PhishTank</th>
                  <th>OpenPhish</th>
                </tr>
              </thead>
              <tbody>
                {data.artifacts.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ maxWidth: 250, overflow: "hidden" }}>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#80ffea", textDecoration: "none" }}
                      >
                        {a.url}
                      </a>
                    </td>
                    <td>{a.domain}</td>
                    <td>{a.ip || "-"}</td>
                    <td>{a.geo?.country || "-"}</td>
                    <td>{a.geo?.isp || "-"}</td>
                    <td>{a.whois?.registrar || "-"}</td>
                    <td>{renderVT(a.virustotal, a.domain)}</td>
                    <td>{a.phishtank?.phish_detected ? "Detectado" : "No"}</td>
                    <td>{a.openphish?.listed ? "Detectado" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {markers.length > 0 && (
            <div
              style={{
                width: "100%",
                height: "400px",
                borderRadius: "8px",
                overflow: "hidden",
                marginTop: "20px",
                border: "1px solid #00b4d8",
                boxShadow: "0 0 8px rgba(0,180,216,0.3)",
              }}
            >
              <MapContainer
                center={[20, 0]}
                zoom={2}
                scrollWheelZoom={false}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "8px",
                }}
              >
                <TileLayer url={tileUrl} attribution={tileAttribution} />
                <MapController
                  markers={markers}
                  darkMode={darkMode}
                  toggleDarkMode={toggleDarkMode}
                />
                {markers.map((m, idx) => (
                  <Marker key={idx} position={[m.lat, m.lon]}>
                    <Popup>
                      <strong>{m.domain}</strong>
                      <br />
                      IP: {m.ip}
                      <br />
                      País: {m.geo?.country || "-"}
                      <br />
                      ISP: {m.geo?.isp || "-"}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ===================== ANALYZE MAIN ===================== */
export default function Analyze() {
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mlInfo, setMlInfo] = useState(null);

  useEffect(() => {
    async function loadML() {
      try {
        const info = await getMLInfo();
        setMlInfo(info);
      } catch (err) {
        console.error("Error obteniendo info ML:", err);
      }
    }
    loadML();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const headersObj = headers.trim() ? JSON.parse(headers) : {};
      const data = await analyzeEmail({ subject, sender, body, headers: headersObj });
      setResult(data);
    } catch {
      setError("No se pudo analizar el correo. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  };

  const fillExample = () => {
    setSubject("Verifica tu cuenta en 24 horas");
    setSender("soporte@banco-seguro.com");
    setBody("Tu cuenta será bloqueada. Verifica aquí: http://bit.ly/re-activar");
    setHeaders('{"Authentication-Results":"spf=fail; dkim=none; dmarc=fail"}');
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#010409",
        color: "#e6e6e6",
        padding: "40px 20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          background: "#0d1117",
          borderRadius: "14px",
          boxShadow: "0 0 20px rgba(0,180,216,0.25)",
          border: "1px solid #00b4d8",
          padding: "40px",
        }}
      >
        <h2 style={{ color: "#00b4d8", textAlign: "center", marginBottom: "10px" }}>
          Analizador de Correos
        </h2>
        <p style={{ textAlign: "center", color: "#9ba1a6", marginBottom: "25px" }}>
          Analiza correos sospechosos mediante heurísticas, Machine Learning y fuentes OSINT.
        </p>

        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <button
            onClick={fillExample}
            style={{
              background: "none",
              color: "#00b4d8",
              border: "1px solid #00b4d8",
              borderRadius: "6px",
              padding: "6px 16px",
              cursor: "pointer",
            }}
          >
            Cargar ejemplo
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="row g-3">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Asunto</label>
              <input
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Confirmación de cuenta"
                required
                style={{
                  background: "#161b22",
                  color: "#e6e6e6",
                  border: "1px solid #30363d",
                }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Remitente</label>
              <input
                type="email"
                className="form-control"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="soporte@empresa.com"
                required
                style={{
                  background: "#161b22",
                  color: "#e6e6e6",
                  border: "1px solid #30363d",
                }}
              />
            </div>

            <div className="col-12 mb-3">
              <label className="form-label fw-semibold">Cuerpo del mensaje</label>
              <textarea
                className="form-control"
                rows="6"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Pega aquí el contenido del correo..."
                required
                style={{
                  background: "#161b22",
                  color: "#e6e6e6",
                  border: "1px solid #30363d",
                }}
              />
            </div>

            <div className="col-12 mb-4">
              <label className="form-label fw-semibold">Headers (JSON opcional)</label>
              <textarea
                className="form-control"
                rows="3"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder='{"Authentication-Results":"spf=pass; dkim=pass; dmarc=pass"}'
                style={{
                  background: "#161b22",
                  color: "#e6e6e6",
                  border: "1px solid #30363d",
                }}
              />
              <small style={{ color: "#8b949e" }}>
                Si no cuentas con headers, puedes dejar este campo vacío.
              </small>
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#00b4d8",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  padding: "10px 30px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {loading ? "Analizando..." : "Analizar Correo"}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div
            style={{
              background: "#3a0a0a",
              color: "#ffb3b3",
              border: "1px solid #ff5555",
              textAlign: "center",
              borderRadius: "6px",
              padding: "10px",
              marginTop: "20px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "30px" }}>
          <ResultCard result={result} />
        </div>

        {result && result.indicators?.found_urls?.length > 0 && (
          <OSINTView
            analysisId={result.analysis_id}
            urls={result.indicators.found_urls}
          />
        )}

        {mlInfo && (
          <div style={{ textAlign: "center", marginTop: "25px" }}>
            <small style={{ color: "#9ba1a6" }}>
              Modelo ML activo: <strong>{mlInfo.name}</strong> v{mlInfo.version} —{" "}
              <em>{mlInfo.mode}</em>
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
