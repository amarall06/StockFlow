import { useEffect, useState } from 'react'
import { loadWarrantyManufacturers } from '../lib/warranty-api'
import { startResumeRefresh } from '../lib/resume-refresh'
import type { DashboardCategory } from '../lib/dashboard-api'

export function DashboardWarranty({ category, revision, onOpen }: { category: DashboardCategory; revision: number; onOpen: () => void }) {
  const [result, setResult] = useState<{ shock: number; spring: number } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let initial = true
    const load = async () => {
      const rows = await loadWarrantyManufacturers(true)
      return rows.reduce((total, row) => ({ shock: total.shock + (row.shock_boxes ?? 0), spring: total.spring + (row.spring_boxes ?? 0) }), { shock: 0, spring: 0 })
    }
    const apply = (value: { shock: number; spring: number }) => { if (active) { setResult(value); setError('') } }
    const fail = () => { if (active) setError('Não foi possível atualizar o saldo de garantia. Confira a conexão e consulte Garantia para tentar novamente.') }
    void load().then(apply).catch(fail).finally(() => { initial = false })
    const stop = startResumeRefresh({ load, apply, onError: fail, intervalMs: 30_000, canRefresh: () => !initial && !document.querySelector('dialog[open]') })
    return () => { active = false; stop() }
  }, [revision])
  const boxes = result && (category === 'shocks' ? result.shock : category === 'springs' ? result.spring : result.shock + result.spring)
  return <section className="inventory-panel dashboard-panel" aria-label="Saldo de garantia">
    <h2>Caixas em garantia</h2>
    {result ? <p><strong>{boxes} caixas</strong> na categoria selecionada. Saldo separado do estoque normal e disponível para venda.</p> : !error && <p role="status">Consultando saldo de garantia…</p>}
    {error && <p role="status">{result ? 'Última consulta preservada. ' : ''}{error}</p>}
    <button type="button" className="theme-toggle" onClick={onOpen}>Consultar Garantia</button>
  </section>
}
