// src/components/ResultCard.jsx
export default function ResultCard({ result }) {
  if (!result) return null;

  const labelColor =
    result.label === "phishing"
      ? "#dc3545" // rojo peligro
      : result.label === "sospechoso"
      ? "#ffc107" // amarillo
      : "#198754"; // verde

  const bgColor = "#0b1119";
  const borderColor = "#1e2a35";

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "10px",
        marginTop: "30px",
        boxShadow: "0 0 10px rgba(0,180,216,0.15)",
        overflow: "hidden",
      }}
    >
      {/* ===== Header ===== */}
      <div
        style={{
          backgroundColor: labelColor,
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 18px",
          fontWeight: "600",
          letterSpacing: "0.3px",
        }}
      >
        <span style={{ textTransform: "uppercase" }}>
          Resultado: {result.label}
        </span>
        <span
          style={{
            background: "#ffffff",
            color: "#000",
            borderRadius: "20px",
            fontWeight: "600",
            padding: "4px 10px",
            fontSize: "0.85rem",
          }}
        >
          Score: {result.risk_score}
        </span>
      </div>

      {/* ===== Body ===== */}
      <div style={{ padding: "20px 22px", color: "#e6e6e6" }}>
        <h6
          style={{
            fontWeight: "600",
            color: "#00b4d8",
            borderBottom: "1px solid #1e2a35",
            paddingBottom: "6px",
            marginBottom: "10px",
          }}
        >
          Motivos
        </h6>

        {result.reasons?.length ? (
          <ul
            style={{
              marginBottom: "18px",
              paddingLeft: "20px",
              lineHeight: "1.6",
            }}
          >
            {result.reasons.map((r, i) => (
              <li key={i} style={{ color: "#dcdcdc" }}>
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: "#9ba1a6", marginBottom: "18px" }}>
            Sin motivos registrados.
          </div>
        )}

        <h6
          style={{
            fontWeight: "600",
            color: "#00b4d8",
            borderBottom: "1px solid #1e2a35",
            paddingBottom: "6px",
            marginBottom: "10px",
          }}
        >
          Indicadores
        </h6>

        <div
          style={{
            backgroundColor: "#161b22",
            border: `1px solid ${borderColor}`,
            borderRadius: "8px",
            padding: "12px",
            color: "#c9d1d9",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            whiteSpace: "pre-wrap",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(result.indicators, null, 2)}
        </div>
      </div>
    </div>
  );
}
