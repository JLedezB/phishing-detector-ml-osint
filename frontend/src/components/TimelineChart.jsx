import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function TimelineChart({ items = [] }) {
  // Agrupar por día y etiqueta
  const counts = {};

  items.forEach(it => {
    const date = new Date(it.created_at);
    const day = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const lbl = it?.result?.label || 'desconocido';

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
      <div className="alert alert-secondary mb-3">
        Aún no hay datos suficientes para graficar evolución temporal.
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header fw-bold">Evolución de correos analizados</div>
      <div className="card-body" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="phishing" stroke="#dc3545" />
            <Line type="monotone" dataKey="sospechoso" stroke="#ffc107" />
            <Line type="monotone" dataKey="legitimo" stroke="#198754" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
