// src/components/LabelDistribution.jsx
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = {
  phishing: "#dc3545", // rojo
  sospechoso: "#ffc107", // amarillo
  legitimo: "#198754", // verde
};

export default function LabelDistribution({ items = [] }) {
  // Contar labels
  const counts = { phishing: 0, sospechoso: 0, legitimo: 0 };
  items.forEach((it) => {
    const lbl = it?.result?.label;
    if (lbl && counts.hasOwnProperty(lbl)) counts[lbl] += 1;
  });

  const data = [
    { name: "Phishing", value: counts.phishing },
    { name: "Sospechoso", value: counts.sospechoso },
    { name: "Legítimo", value: counts.legitimo },
  ];

  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) {
    return (
      <div
        style={{
          backgroundColor: "#0b1119",
          border: "1px solid #1e2a35",
          color: "#9ba1a6",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        No hay datos suficientes para graficar aún.
      </div>
    );
  }

  // 🔧 Filtrar solo los elementos con valor > 0
  const filteredData = data.filter((d) => d.value > 0);

  // 🔧 Mapeo seguro para nombres → claves del color
  const getColorKey = (name) => {
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
    return COLORS[n] || "#6c757d"; // gris por fallback
  };

  return (
    <div
      style={{
        backgroundColor: "#0b1119",
        border: "1px solid #1e2a35",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 0 10px rgba(0,180,216,0.15)",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #1e2a35",
          marginBottom: "15px",
          paddingBottom: "6px",
          color: "#00b4d8",
          fontWeight: "600",
          fontSize: "0.95rem",
        }}
      >
        Distribución por Etiqueta
      </div>

      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={100}
              stroke="#0d1117"
              strokeWidth={2}
              label={({ name, value }) =>
                value > 0
                  ? `${name}: ${((value / total) * 100).toFixed(1)}%`
                  : ""
              }
              labelLine={false}
            >
              {filteredData.map((entry, idx) => (
                <Cell key={idx} fill={getColorKey(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                color: "#e6e6e6",
                borderRadius: "6px",
              }}
            />
            <Legend
              wrapperStyle={{
                color: "#9ba1a6",
                fontSize: "0.85rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: "12px",
          color: "#9ba1a6",
          fontSize: "0.9rem",
          textAlign: "center",
        }}
      >
        Total analizados:{" "}
        <strong style={{ color: "#e6e6e6" }}>{total}</strong>
      </div>
    </div>
  );
}
