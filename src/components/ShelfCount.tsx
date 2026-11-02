import { useState, useSyncExternalStore } from 'react'
import type { ProductInfo, StockRow } from '../lib/inventory-api'
import { beginShelfCount, countRowKey, countSummary, parseShelfCount, shelfCountHeaders, shelfCountReport, shelfReference, validCountStatus, type ShelfCount as Draft } from '../lib/shelf-count'
import { readShelfCountRaw, saveShelfCount, subscribeShelfCount } from '../lib/shelf-count-store'
import { downloadCsv } from '../lib/csv'
import { isSpringCode } from '../lib/product-category'
import type { DashboardCategory } from '../lib/dashboard-api'
import './ShelfCount.css'

function useDraft(userId: string) {
  const raw = useSyncExternalStore(subscribeShelfCount, () => readShelfCountRaw(userId), () => null)
  try { return { raw, draft: parseShelfCount(raw, userId), error: '' } }
  catch { return { raw, draft: null, error: 'Não foi possível ler a contagem local. Os dados foram preservados; não inicie outra contagem neste aparelho antes da revisão.' } }
}
function openCount(onOpen: () => void) {
  onOpen()
  requestAnimationFrame(() => {
    const details = document.querySelector<HTMLDetailsElement>('#shelf-count')
    if (details) { details.open = true; details.querySelector('summary')?.focus(); details.scrollIntoView({ block: 'start' }) }
  })
}
export function ShelfCountNotice({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const { draft, error } = useDraft(userId)
  if (!draft && !error) return null
  const summary = draft && countSummary(draft)
  return <p role="status">{error || `Contagem local de ${draft!.location}: ${summary!.pending} itens por contar; ${summary!.differences} itens com divergência. Não enviada para aprovação.`} <button className="theme-toggle" type="button" onClick={() => openCount(onOpen)}>Conferir contagem de prateleira</button></p>
}
export function ShelfCountDivergences({ userId, category, stock, onOpen }: { userId: string; category: DashboardCategory; stock: StockRow[]; onOpen: () => void }) {
  const { draft, error } = useDraft(userId)
  if (!draft && !error) return null
  if (error) return <p role="status">Resumo de divergências locais indisponível. Preserve o rascunho para revisão.</p>
  const rows = draft!.rows.filter(row => category === 'all' || isSpringCode(row.code) === (category === 'springs'))
  const summary = countSummary({ ...draft!, rows })
  const changed = shelfReference(stock, draft!.location) !== draft!.reference
  return <section className="inventory-panel shelf-count" aria-label="Divergências da contagem local">
    <h2>Divergências da contagem local</h2>
    <p>Somente o rascunho desta conta e aparelho, com referência de {formatDate(draft!.consultedAt)}. Não representa conferências aprovadas nem histórico de divergências da empresa.</p>
    {changed && <p role="status">O saldo consultado mudou. Esta comparação exige revisão e nova contagem.</p>}
    <div className="shelf-count-scroll" tabIndex={0} role="region" aria-label="Rolagem das divergências locais"><table aria-label="Resumo de divergências locais por prateleira"><thead><tr><th>Prateleira</th><th>Itens por contar</th><th>Itens divergentes</th><th>Caixas faltantes</th><th>Caixas excedentes</th></tr></thead><tbody><tr><td>{draft!.location}</td><td>{summary.pending}</td><td>{summary.differences}</td><td>{summary.missing}</td><td>{summary.extra}</td></tr></tbody></table></div>
    {!rows.length && <p>Nenhum item desta categoria no rascunho; isso não comprova ausência de divergências físicas.</p>}
    <button className="theme-toggle" type="button" onClick={() => openCount(onOpen)}>Abrir contagem local</button>
  </section>
}
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
export function ShelfCount({ userId, stock, catalog, locations, consultedAt, onRefresh, presentationSharing=false }: { userId: string; stock: StockRow[]; catalog: Record<string, ProductInfo>; locations: string[]; consultedAt: string; onRefresh: () => Promise<unknown>;presentationSharing?:boolean }) {
  const { raw, draft, error } = useDraft(userId)
  const [location, setLocation] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<StockRow['status']>('Aguardando testagem')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const summary = draft && countSummary(draft)
  const changed = Boolean(draft && (!locations.includes(draft.location) || shelfReference(stock, draft.location) !== draft.reference || draft.rows.some(row => !catalog[row.code])))
  function save(value: Draft | null) {
    try { saveShelfCount(userId, value, raw); setMessage(value ? 'Rascunho salvo neste aparelho.' : 'Rascunho local descartado.'); return true }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Não foi possível salvar.'); return false }
  }
  return <details className="inventory-panel shelf-count" id="shelf-count">
    <summary>Conferência de prateleira — contagem local</summary>
    <p>Conte caixas por produto e situação. Este rascunho fica somente nesta conta e aparelho, pode ser exportado para revisão e não altera o estoque. {presentationSharing?'Use o envio compartilhado abaixo para registrar uma cópia aguardando revisão. Não há aprovação nem ajuste de saldo nesta apresentação.':'Envio e aprovação ainda não estão disponíveis.'}</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!draft && !error && <form onSubmit={event => { event.preventDefault(); try { if (!navigator.onLine || !locations.includes(location)) throw new Error('Conecte e selecione uma prateleira válida antes de iniciar.'); save(beginShelfCount(userId, location, stock, consultedAt)) } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Não foi possível iniciar.') } }}>
      <label>Prateleira para contar<select required value={location} onChange={event => setLocation(event.target.value)}><option value="">Selecione</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label>
      <button type="submit" className="theme-toggle">Iniciar contagem local</button>
    </form>}
    {draft && <>
      <h2>Contagem de {draft.location}</h2>
      <p>Consulta de referência: {formatDate(draft.consultedAt)}. Início: {formatDate(draft.startedAt)}. Referência congelada para esta contagem.</p>
      <p role="status">{summary!.pending} itens por contar. {summary!.differences} itens com divergência: faltam {summary!.missing} caixas e sobram {summary!.extra} caixas em relação à referência. Itens não preenchidos não contam como zero.</p>
      {changed && <p role="alert" className="auth-error">O saldo consultado ou o cadastro mudou desde o início. Preserve a contagem para revisão e faça nova contagem antes de solicitar ajuste. A referência não foi substituída.</p>}
      <div className="shelf-count-scroll" tabIndex={0} role="region" aria-label="Rolagem da contagem"><table aria-label="Contagem física por produto e situação"><thead><tr><th>Produto</th><th>Situação</th><th>Esperado</th><th>Contado em caixas</th><th>Diferença</th></tr></thead><tbody>{draft.rows.map(row => <tr key={countRowKey(row)}><td>{row.code}</td><td>{row.status}</td><td>{row.expected}</td><td><input aria-label={`Caixas contadas ${row.code} ${row.status}`} type="number" min="0" max="2147483647" step="1" value={row.counted ?? ''} onChange={event => {
        const text = event.target.value, counted = text === '' ? null : Number(text)
        if (counted !== null && (!Number.isSafeInteger(counted) || counted < 0 || counted > 2147483647)) { setMessage('Informe uma quantidade inteira de caixas entre zero e 2147483647.'); return }
        save({ ...draft, rows: draft.rows.map(item => countRowKey(item) === countRowKey(row) ? { ...item, counted } : item) })
      }}/></td><td>{row.counted === null ? 'Não contado' : row.counted - row.expected}</td></tr>)}</tbody></table></div>
      {!draft.rows.length && <p>Não havia saldo nesta prateleira na consulta. Se encontrou caixas, acrescente um produto cadastrado abaixo.</p>}
      <form className="shelf-count-add" onSubmit={event => { event.preventDefault(); const normalized = code.trim().toUpperCase(); if (!catalog[normalized] || !validCountStatus(normalized, status)) { setMessage('Selecione um produto cadastrado e uma situação compatível. Molas ficam em estoque.'); return } if (draft.rows.some(row => row.code === normalized && row.status === status)) { setMessage('Este produto e situação já estão na contagem.'); return } if (save({ ...draft, rows: [...draft.rows, { code: normalized, status, expected: 0, counted: null }] })) setCode('') }}>
        <label>Produto encontrado sem saldo<select value={code} onChange={event => { const value = event.target.value; setCode(value); setStatus(validCountStatus(value, 'Em estoque') ? 'Em estoque' : 'Aguardando testagem') }} required><option value="">Selecione</option>{Object.keys(catalog).sort().map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Situação encontrada<select value={status} onChange={event => setStatus(event.target.value as StockRow['status'])}>{(['Aguardando testagem', 'Liberado para venda', 'Em estoque'] as const).filter(value => validCountStatus(code, value)).map(value => <option key={value}>{value}</option>)}</select></label>
        <button type="submit" className="theme-toggle">Acrescentar à contagem</button>
      </form>
      <label>Observação da contagem<textarea maxLength={2000} value={draft.notes} onChange={event => save({ ...draft, notes: event.target.value })}/></label>
      <div className="shelf-count-actions">
        <button type="button" className="theme-toggle" disabled={busy} onClick={async () => { setBusy(true); try { await onRefresh(); setMessage('Consulta atualizada. Confira o aviso de mudanças antes da revisão.') } catch { setMessage('Não foi possível atualizar. A contagem foi preservada.') } finally { setBusy(false) } }}>Atualizar saldo para comparação</button>
        <button type="button" className="theme-toggle" disabled={!draft.rows.length || Boolean(summary!.pending)} onClick={() => { try { downloadCsv('conferencia-prateleira-rascunho', shelfCountHeaders, shelfCountReport(draft, changed)); setMessage('CSV de rascunho preparado para revisão. Não enviado nem aprovado.') } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Falha na exportação.') } }}>Exportar contagem para revisão</button>
        <button type="button" className="theme-toggle" onClick={() => { if (window.confirm('Descartar esta contagem local? Os valores contados serão removidos deste aparelho. O estoque não será alterado.')) save(null) }}>Descartar contagem local</button>
      </div>
    </>}
  </details>
}
