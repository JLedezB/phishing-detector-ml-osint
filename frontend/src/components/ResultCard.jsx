export default function ResultCard({ result }) {
  if (!result) return null

  const badge = result.label === 'phishing'
    ? 'danger'
    : result.label === 'sospechoso'
    ? 'warning'
    : 'success'

  return (
    <div className="card shadow-sm border-0 my-4">
      <div className={`card-header d-flex align-items-center justify-content-between bg-${badge} text-white`}>
        <strong className="text-uppercase">Resultado: {result.label}</strong>
        <span className="badge bg-light text-dark">
          Score: <span className="fw-bold">{result.risk_score}</span>
        </span>
      </div>

      <div className="card-body">
        <h6 className="fw-bold mb-2">Motivos</h6>
        {result.reasons?.length ? (
          <ul className="mb-3">
            {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        ) : (
          <div className="text-muted mb-3">Sin motivos registrados.</div>
        )}

        <h6 className="fw-bold mb-2">Indicadores</h6>
        <div className="bg-light border rounded p-3 small">
          <pre className="mb-0">{JSON.stringify(result.indicators, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
