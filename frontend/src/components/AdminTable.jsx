// src/components/AdminTable.jsx
export default function AdminTable({ title, columns, data }) {
  return (
    <div className="card shadow-sm p-3">
      <h5 className="mb-3 text-center">{title}</h5>
      <div className="table-responsive">
        <table className="table table-striped align-middle text-center">
          <thead className="table-dark">
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col}>{row[col] ?? "-"}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-muted">
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
