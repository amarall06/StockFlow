import { useEffect, useRef, useState } from 'react'
import type { ReportPeriod } from '../lib/report-period'

export function StockReportExport() {
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [day, setDay] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia' }).format(new Date()))
  const [busy, setBusy] = useState(false)
  const guard = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const [message, setMessage] = useState('')
  const exportReport = async (format: 'pdf' | 'xlsx') => {
    if (guard.current) return
    guard.current = true; setBusy(true); setMessage('Consultando os dados do relatório…')
    try {
      const [{ loadStockReport }, { createStockReportFile, downloadReport }] = await Promise.all([import('../lib/stock-report'), import('../lib/stock-report-download')])
      const report = await loadStockReport(day, period)
      if (!active.current) return
      const file = await createStockReportFile(report, format)
      if (!active.current) return
      downloadReport(file, format)
      setMessage('Relatório preparado para download.')
    } catch (error) { if (active.current) setMessage(error instanceof Error ? error.message : 'Não foi possível gerar o relatório. Confira a conexão e tente novamente.') }
    finally { guard.current = false; if (active.current) setBusy(false) }
  }
  return <section className="inventory-panel dashboard-panel" aria-label="Relatório PDF e Excel">
    <h2>Relatório de estoque</h2><p>Saldo atual de amortecedores e molas, sem garantia, e movimentações do período. Não representa saldo de fechamento histórico.</p>
    <fieldset disabled={busy} className="dashboard-tools"><label>Período do relatório<select value={period} onChange={event => setPeriod(event.target.value as ReportPeriod)}><option value="week">Semana (segunda a domingo)</option><option value="month">Mês</option><option value="year">Ano</option></select></label><label>Data de referência<input type="date" value={day} onChange={event => setDay(event.target.value)} /></label>
      <button type="button" className="theme-toggle" disabled={!day} onClick={() => void exportReport('pdf')}>Baixar PDF</button><button type="button" className="theme-toggle" disabled={!day} onClick={() => void exportReport('xlsx')}>Baixar Excel</button>
    </fieldset>{message && <p role="status">{message}</p>}
  </section>
}
