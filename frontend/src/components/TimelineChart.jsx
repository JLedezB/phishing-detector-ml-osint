// src/components/TimelineChart.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TimelineChart({ items = [] }) {
  // === Agrupar por día y etiqueta ===
  const counts = {};

  items.forEach((it) => {
    const date = new Date(it.created_at);
    const day = date.toISOString().slice(0, 10);
    const lbl = it?.result?.label || "desconocido";

    if (!counts[day]) {
      counts[day] = { day, phishing: 0, sospechoso: 0, legitimo: 0 };
    }
    if (lbl in counts[day]) {
      counts[day][lbl] += 1;
    }
  });

  const data = Object.values(counts).sort((a, b) => a.day.localeCompare(b.day));

  if (data.length === 0) {
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
        No hay datos suficientes para graficar la evolución temporal.
      </div>
    );
  }

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
          textAlign: "center",
        }}
      >
        Evolución de Correos Analizados
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f36" />
            <XAxis
              dataKey="day"
              stroke="#9ba1a6"
              tick={{ fill: "#9ba1a6", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              stroke="#9ba1a6"
              tick={{ fill: "#9ba1a6", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                borderRadius: "6px",
                color: "#e6e6e6",
                fontSize: "0.85rem",
              }}
            />
            <Legend
              wrapperStyle={{
                color: "#9ba1a6",
                fontSize: "0.85rem",
                marginTop: "10px",
              }}
            />
            <Line
              type="monotone"
              dataKey="phishing"
              stroke="#dc3545"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="sospechoso"
              stroke="#ffc107"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="legitimo"
              stroke="#198754"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
