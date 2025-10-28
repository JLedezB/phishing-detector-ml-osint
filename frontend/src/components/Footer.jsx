// src/components/Footer.jsx
export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#0d1117",
        color: "#9ba1a6",
        borderTop: "1px solid #00b4d8",
        padding: "16px 0",
        textAlign: "center",
        marginTop: "auto",
        boxShadow: "0 -2px 8px rgba(0,180,216,0.15)",
      }}
    >
      <div className="container">
        <small style={{ fontSize: "0.9rem" }}>
          <strong style={{ color: "#e6e6e6" }}>Phishing Detector</strong> — Proyecto de Titulación •{" "}
          <span style={{ color: "#00b4d8", fontWeight: "600" }}>
            Joaquín Ledezma Barragán © 2025
          </span>
        </small>
      </div>
    </footer>
  );
}
