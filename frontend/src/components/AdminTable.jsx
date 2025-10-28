export default function AdminTable({ title, columns, data }) {
  return (
    <div
      style={{
        backgroundColor: "#0d1117",
        border: "1px solid #1e2a35",
        borderRadius: "10px",
        boxShadow: "0 0 15px rgba(0,180,216,0.08)",
        padding: "20px",
        color: "#e6e6e6",
        transition: "all 0.3s ease",
      }}
    >
      {/* ===== TÍTULO ===== */}
      <h5
        style={{
          textAlign: "center",
          color: "#00b4d8",
          fontWeight: "600",
          marginBottom: "20px",
        }}
      >
        {title}
      </h5>

      {/* ===== TABLA ===== */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "#e6e6e6",
            fontSize: "0.95rem",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {/* === ENCABEZADO === */}
          <thead>
            <tr
              style={{
                backgroundColor: "#111820",
                borderBottom: "2px solid #00b4d8",
              }}
            >
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: "600",
                    color: "#00b4d8",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    fontSize: "0.85rem",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* === CUERPO === */}
          <tbody>
            {data.length > 0 ? (
              data.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#0f1622" : "#101820",
                    borderBottom: "1px solid #1f2833",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#162230")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      i % 2 === 0 ? "#0f1622" : "#101820")
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: "10px 14px",
                        textAlign: "center",
                        color: "#d1d5db",
                      }}
                    >
                      {row[col] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    color: "#9ba1a6",
                    padding: "20px",
                  }}
                >
                  No hay datos disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
