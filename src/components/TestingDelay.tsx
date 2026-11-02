import { useRef, useState, useSyncExternalStore } from 'react'
import { parseTestingDays, readTestingDays, sampleTestingGroups, saveTestingDays, subscribeTestingDays, testingDelays, testingReference } from '../lib/testing-delay'
import './TestingDelay.css'

function DeadlineEditor({ days, onSave }: { days: number; onSave: (days: number) => void }) {
  const [value, setValue] = useState(String(days))
  return <form aria-label="Configurar prazo de testagem" onSubmit={event => { event.preventDefault(); onSave(Number(value)) }}>
    <label>Prazo de testagem (dias corridos)<input type="number" required min={1} max={3650} step={1} value={value} onChange={event => setValue(event.target.value)} /></label>
    <button type="submit" className="theme-toggle">Salvar prazo local</button>
  </form>
}
export function TestingDelay({ userId, canEdit, groups=sampleTestingGroups }: { userId: string; canEdit: boolean; groups?:typeof sampleTestingGroups }) {
  const raw = useSyncExternalStore(subscribeTestingDays, () => readTestingDays(userId), () => null)
  const [feedback, setFeedback] = useState({ text: '', error: false })
  const busy = useRef(false)
  let days = 7, error = ''
  try { days = parseTestingDays(raw, userId) } catch { error = 'Não foi possível recuperar o prazo local. Os dados foram preservados; a avaliação está bloqueada até a revisão.' }
  const rows = error ? [] : testingDelays(groups, days, testingReference)
  const sum = (situation: string) => rows.filter(row => row.situation === situation).reduce((total, row) => total + row.boxes, 0)
  const labels = { overdue: 'Prazo ultrapassado', within: 'Dentro do prazo', unknown: 'Sem data — conferir', future: 'Data futura — conferir' }
  return <section className="inventory-panel dashboard-panel testing-delay" aria-label="Pendências de testagem">
    <h2>Pendências de testagem</h2>
    <p>Referência da apresentação: 02/11/2026. O cenário distribui os 20 amortecedores aguardando testagem por data de entrada nessa situação. Molas não passam por testagem.</p>
    <p>Prazo da apresentação: {days} dias corridos. O aviso aparece quando o tempo é maior que o prazo; no dia limite permanece dentro do prazo. Esta configuração não define a regra real da empresa.</p>
    {error && <p role="alert">{error}</p>}
    {feedback.text && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {!error && <>
      <p role="status">{sum('overdue')} caixas com prazo ultrapassado · {sum('within')} dentro do prazo · {sum('unknown')} sem data.</p>
      {sum('overdue') === 0 && <p>Nenhuma caixa com data conhecida ultrapassou o prazo configurado. Itens sem data continuam exigindo conferência.</p>}
      <ul aria-label="Grupos aguardando testagem">{rows.map(row => <li key={row.id}>
        <h3>{row.id} — {row.code} · {row.location}</h3>
        <p>{row.boxes} caixas · {row.since ? `Aguardando desde ${row.since.split('-').reverse().join('/')}` : 'Data de início não informada'}{row.age !== null ? ` · ${row.age} dias corridos` : ''}</p>
        <strong>{labels[row.situation]}</strong>
      </li>)}</ul>
      {canEdit ? <DeadlineEditor key={raw} days={days} onSave={value => {
        if (busy.current) return
        busy.current = true
        try { saveTestingDays(userId, value, raw); setFeedback({ text: 'Prazo salvo neste navegador. Pendências recalculadas; nenhum teste foi aprovado e nenhum saldo foi alterado.', error: false }) }
        catch (caught) { setFeedback({ text: caught instanceof Error ? caught.message : 'Não foi possível salvar o prazo.', error: true }) }
        finally { busy.current = false }
      }} /> : <p>A configuração do prazo nesta apresentação é feita pelo Administrador.</p>}
    </>}
  </section>
}
