import { useState } from 'react'
import { downloadCsv, type CsvCell } from '../lib/csv'

export function ExportCsvButton({ name, headers, rows, disabled = false }: {
  name: string; headers: string[]; rows: CsvCell[][]; disabled?: boolean
}) {
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)
  return <div className="csv-export">
    <button type="button" className="theme-toggle" disabled={disabled || rows.length === 0} onClick={() => {
      try {
        downloadCsv(name, headers, rows)
        setFailed(false)
        setFeedback('Arquivo preparado para download.')
      } catch {
        setFailed(true)
        setFeedback('Não foi possível preparar o arquivo. Atualize a consulta e tente novamente.')
      }
    }}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg> Exportar CSV</button>
    {feedback && <small role={failed ? 'alert' : 'status'}>{feedback}</small>}
  </div>
}
