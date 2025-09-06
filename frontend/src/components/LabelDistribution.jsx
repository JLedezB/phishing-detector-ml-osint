import {
  PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = {
  phishing: '#dc3545',    // danger
  sospechoso: '#ffc107',  // warning
  legitimo: '#198754',    // success
};

export default function LabelDistribution({ items = [] }) {
  // Contar labels
  const counts = { phishing: 0, sospechoso: 0, legitimo: 0 };
  items.forEach(it => {
    const lbl = it?.result?.label;
    if (lbl && counts.hasOwnProperty(lbl)) counts[lbl] += 1;
  });

  const data = [
    { name: 'phishing', value: counts.phishing },
    { name: 'sospechoso', value: counts.sospechoso },
    { name: 'legitimo', value: counts.legitimo },
  ];

  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) {
    return (
      <div className="alert alert-secondary mb-3">
        Aún no hay datos suficientes para graficar.
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header fw-bold">Distribución por etiqueta</div>
      <div className="card-body" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={110}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 small text-muted">
          Total analizados: <strong>{total}</strong>
        </div>
      </div>
    </div>
  );
}
