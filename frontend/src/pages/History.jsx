import { useEffect, useMemo, useState } from 'react'
import { listEmails } from '../api'
import LabelDistribution from '../components/LabelDistribution'
import TimelineChart from '../components/TimelineChart'


export default function History() {
  const [items, setItems] = useState([])
  const [limit, setLimit] = useState(20)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filters, setFilters] = useState({
    phishing: true,
    sospechoso: true,
    legitimo: true,
  })
  const [query, setQuery] = useState('') // búsqueda por asunto o remitente

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const res = await listEmails(limit)
        setItems(res.items || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [limit])

  const toggleLabel = (name) => {
    setFilters((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  // Datos ya filtrados (tabla + gráfica)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items || []).filter((it) => {
      const lbl = it?.result?.label
      if (!filters[lbl]) return false

      if (!q) return true
      const subj = (it?.email?.subject || '').toLowerCase()
      const sndr = (it?.email?.sender || '').toLowerCase()
      return subj.includes(q) || sndr.includes(q)
    })
  }, [items, filters, query])

  const countShown = filtered.length

  return (
    <div className="container my-4">
      {/* Header */}
      <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Historial</h3>

        <div className="d-flex gap-2 align-items-center">
          <label className="me-2">Límite</label>
          <input
            type="number"
            min="1"
            max="100"
            className="form-control"
            style={{ width: 100 }}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Controles de filtro */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body d-flex flex-wrap gap-3 align-items-center">
          <div className="d-flex gap-2 align-items-center">
            <span className="text-muted me-2">Filtros:</span>

            <button
              type="button"
              className={`btn btn-sm ${filters.phishing ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => toggleLabel('phishing')}
            >
              phishing
            </button>

            <button
              type="button"
              className={`btn btn-sm ${filters.sospechoso ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => toggleLabel('sospechoso')}
            >
              sospechoso
            </button>

            <button
              type="button"
              className={`btn btn-sm ${filters.legitimo ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => toggleLabel('legitimo')}
            >
              legítimo
            </button>
          </div>

          <div className="ms-auto d-flex align-items-center" style={{ minWidth: 260 }}>
            <input
              className="form-control"
              placeholder="Buscar (asunto o remitente)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="card-footer text-muted small">
          {countShown} resultado(s) mostrados
        </div>
      </div>

      {/* Gráfica de distribución (usa los datos ya filtrados) */}
      <LabelDistribution items={filtered} />
      <TimelineChart items={filtered} />


      {loading && <div className="alert alert-info">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Asunto</th>
                    <th>Remitente</th>
                    <th>Etiqueta</th>
                    <th>Score</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it.analysis_id}>
                      <td>{new Date(it.created_at).toLocaleString()}</td>
                      <td>{it.email?.subject}</td>
                      <td>{it.email?.sender}</td>
                      <td>
                        <span
                          className={`badge text-bg-${
                            it.result?.label === 'phishing'
                              ? 'danger'
                              : it.result?.label === 'sospechoso'
                              ? 'warning'
                              : 'success'
                          }`}
                        >
                          {it.result?.label}
                        </span>
                      </td>
                      <td>{it.result?.risk_score}</td>
                      <td className="text-truncate" style={{ maxWidth: 140 }}>
                        {it.analysis_id}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        Sin registros que coincidan con los filtros/búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
