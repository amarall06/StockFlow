import { useRef, useState, useSyncExternalStore } from 'react'
import { parseRecurrenceRule, readRecurrenceRaw, recurrenceReference, recurringDivergences, sampleDivergenceChecks, saveRecurrenceRule, subscribeRecurrence, type RecurrenceRule } from '../lib/recurring-divergences'
import { locateMissionShelf } from '../lib/map-navigation'
import './RecurringDivergences.css'

function RecurrenceEditor({ rule, onSave }: { rule: RecurrenceRule; onSave: (rule: RecurrenceRule) => void }) {
  const [occurrences, setOccurrences] = useState(String(rule.occurrences)), [days, setDays] = useState(String(rule.days))
  return <form aria-label="Configurar divergências recorrentes" onSubmit={event => { event.preventDefault(); onSave({ occurrences: Number(occurrences), days: Number(days) }) }}>
    <label>Mínimo de conferências com diferença<input type="number" min={2} max={100} step={1} required value={occurrences} onChange={event => setOccurrences(event.target.value)}/></label>
    <label>Período de recorrência (dias corridos)<input type="number" min={1} max={3650} step={1} required value={days} onChange={event => setDays(event.target.value)}/></label>
    <button className="theme-toggle" type="submit">Salvar regra de recorrência local</button>
  </form>
}
export function RecurringDivergences({ userId, canEdit, checks=sampleDivergenceChecks }: { userId: string; canEdit: boolean; checks?:typeof sampleDivergenceChecks }) {
  const raw = useSyncExternalStore(subscribeRecurrence, () => readRecurrenceRaw(userId), () => null)
  const [message, setMessage] = useState({ text: '', error: false }), busy = useRef(false)
  let rule: RecurrenceRule | null = null, error = ''
  try { rule = parseRecurrenceRule(raw, userId) } catch { error = 'Não foi possível recuperar a regra local. Dados preservados; avaliação bloqueada até revisão.' }
  const results = rule ? recurringDivergences(checks, rule, recurrenceReference) : []
  return <section className="inventory-panel dashboard-panel recurring-divergences" aria-label="Divergências recorrentes">
    <h2>Divergências recorrentes</h2>
    <p>Histórico da apresentação em 02/11/2026. Conta conferências distintas revisadas por produto, prateleira e situação. Rascunhos, resultados iguais e datas fora do período não entram.</p>
    <p>As diferenças históricas não são o saldo atual e não representam ajuste ou aprovação de estoque. Esta regra local não define a política real da empresa.</p>
    {error && <p role="alert">{error}</p>}{message.text && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    {rule && <>
      <p role="status">{results.length} combinações com recorrência · mínimo {rule.occurrences} conferências em {rule.days} dias corridos, incluindo a data de referência.</p>
      {!results.length && <p>Nenhuma combinação atingiu a regra neste período. Isso não comprova ausência de divergências isoladas.</p>}
      <ul aria-label="Recorrências encontradas">{results.map(result => <li key={JSON.stringify([result.code,result.location,result.status])}>
        <h3>{result.code} — {result.location}</h3><p>{result.status} · {result.evidence.length} conferências com diferença</p>
        <p>Soma das diferenças absolutas: {result.absoluteDifference} caixas. Não é saldo a ajustar.</p>
        <details><summary>Ver conferências de {result.code} em {result.location}</summary><ul>{result.evidence.map(check => <li key={check.sessionId}>{check.sessionId} · {check.date.split('-').reverse().join('/')} · Esperado: {check.expected} · Contado: {check.counted} · Diferença: {check.difference > 0 ? '+' : ''}{check.difference}</li>)}</ul></details>
        <button className="theme-toggle" type="button" onClick={() => { try { locateMissionShelf(userId,result.location) } catch { setMessage({ text:'Não foi possível localizar a prateleira no mapa.',error:true }) } }}>Ver {result.location} no mapa de recorrências</button>
      </li>)}</ul>
      {canEdit ? <RecurrenceEditor key={raw} rule={rule} onSave={value => {
        if (busy.current) return
        busy.current = true
        try { saveRecurrenceRule(userId,value,raw); setMessage({ text:'Regra salva neste navegador. Recorrências recalculadas sem alterar estoque.',error:false }) }
        catch (caught) { setMessage({ text: caught instanceof Error ? caught.message : 'Não foi possível salvar a regra.',error:true }) }
        finally { busy.current = false }
      }}/> : <p>A configuração da recorrência nesta apresentação é feita pelo Administrador.</p>}
    </>}
  </section>
}
