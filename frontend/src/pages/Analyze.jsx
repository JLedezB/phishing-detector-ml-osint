import { useState } from 'react'
import { analyzeEmail } from '../api'
import ResultCard from '../components/ResultCard'

export default function Analyze() {
  const [subject, setSubject] = useState('')
  const [sender, setSender] = useState('')
  const [body, setBody] = useState('')
  const [headers, setHeaders] = useState('{"Authentication-Results":"spf=fail; dkim=none; dmarc=fail"}') // demo
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    let headersObj = undefined
    if (headers.trim()) {
      try {
        headersObj = JSON.parse(headers)
      } catch {
        setError('Headers debe ser JSON válido (o déjalo vacío).')
        setLoading(false)
        return
      }
    }

    try {
      const data = await analyzeEmail({ subject, sender, body, headers: headersObj })
      setResult(data)
    } catch (err) {
      setError('No se pudo analizar el correo. Verifica que el backend esté activo.')
    } finally {
      setLoading(false)
    }
  }

  const fillExample = () => {
    setSubject('⚠️ Verifica tu cuenta en 24 horas')
    setSender('soporte@banco-seguro.com')
    setBody('Tu cuenta será bloqueada. Verifica aquí: http://bit.ly/re-activar')
    setHeaders('{"Authentication-Results":"spf=fail; dkim=none; dmarc=fail"}')
  }

  return (
    <div className="container my-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Analizar correo</h3>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={fillExample}>
          Usar ejemplo
        </button>
      </div>

      <form onSubmit={onSubmit} className="card shadow-sm border-0">
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label fw-semibold">Asunto</label>
            <input
              className="form-control"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej. Confirmación de cuenta"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Remitente (email)</label>
            <input
              type="email"
              className="form-control"
              value={sender}
              onChange={e => setSender(e.target.value)}
              placeholder="alguien@dominio.com"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Cuerpo</label>
            <textarea
              className="form-control"
              rows="6"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Pega aquí el contenido del mensaje…"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Headers (JSON opcional)</label>
            <textarea
              className="form-control"
              rows="3"
              value={headers}
              onChange={e => setHeaders(e.target.value)}
              placeholder='{"Authentication-Results":"spf=pass; dkim=pass; dmarc=pass"}'
            />
            <div className="form-text">
              Si no los tienes, puedes dejarlo vacío.
            </div>
          </div>

          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Analizando…' : 'Analizar'}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger my-3">{error}</div>}

      {/* Tarjeta de resultado con estilos mejorados */}
      <ResultCard result={result} />
    </div>
  )
}
