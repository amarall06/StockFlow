import { useRef, useState, useSyncExternalStore } from 'react'
import type { StockRow } from '../lib/inventory-api'
import { capacityRows, demoCapacities, demoLocations, demoStock, parseCapacities, readCapacityRaw, saveCapacities, subscribeCapacities, type Capacities, type Capacity, type CapacityMode } from '../lib/shelf-capacity'
import { useModalDialog } from '../lib/use-modal-dialog'
import { FictionalShelfMap } from './FictionalShelfMap'
import './ShelfCapacity.css'
import type {PresentationBundle} from '../lib/presentation-bundle'

function CapacityEditor({ location, entry, onSave, onClose }: { location: string; entry: Capacity | null; onSave: (entry: Capacity | null) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [boxes, setBoxes] = useState(entry?.boxes.toString() ?? '')
  const [basis, setBasis] = useState(entry?.basis ?? '')
  const [error, setError] = useState('')
  useModalDialog(ref)
  return <dialog ref={ref} className="capacity-dialog" aria-labelledby="capacity-editor-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <header><h2 id="capacity-editor-title">Capacidade de {location}</h2><button type="button" className="theme-toggle" onClick={onClose}>Fechar capacidade</button></header>
    <p>Configuração local neste navegador, separada por conta na área autenticada. Informe capacidade em caixas equivalentes; deixe a quantidade vazia para remover a referência.</p>
    <form onSubmit={event => { event.preventDefault(); try { if (boxes !== '' && (!/^\d+$/.test(boxes) || !Number.isSafeInteger(Number(boxes)) || Number(boxes) < 1 || Number(boxes) > 2147483647 || !basis.trim())) throw Error('Informe capacidade inteira positiva e a referência do tamanho da caixa.'); onSave(boxes === '' ? null : { boxes: Number(boxes), basis: basis.trim() }) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.') } }}>
      <label>Capacidade física (caixas)<input type="number" min="1" max="2147483647" step="1" value={boxes} onChange={event => setBoxes(event.target.value)}/></label>
      <label>Referência de tamanho da caixa<input maxLength={120} required={boxes !== ''} value={basis} onChange={event => setBasis(event.target.value)} placeholder="Informe o padrão de caixa usado"/></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="theme-toggle">Salvar capacidade local</button>
    </form>
  </dialog>
}
export function ShelfCapacity({ userId, locations, stock, canEdit, demoOnly = false, stockOnly=false, presentationData, sharedView=false }: { userId: string; locations: string[]; stock: StockRow[]; canEdit: boolean; demoOnly?: boolean;stockOnly?:boolean; presentationData?:PresentationBundle; sharedView?:boolean }) {
  const scenarioStock=presentationData?.stock??demoStock,scenarioLocations=presentationData?.locations??demoLocations,scenarioCapacities=presentationData?.capacities??demoCapacities
  const [mode, setMode] = useState<CapacityMode>(demoOnly ? 'demo' : 'stock')
  const raw = useSyncExternalStore(subscribeCapacities, () => readCapacityRaw(userId, mode), () => null)
  const [editing, setEditing] = useState<{ location: string; raw: string | null; entries: Capacities } | null>(null)
  const [message, setMessage] = useState('')
  let entries: Capacities = {}, error = ''
  try { entries = sharedView?scenarioCapacities:mode === 'demo' && raw === null ? scenarioCapacities : parseCapacities(raw, userId) }
  catch (caught) { error = caught instanceof Error ? caught.message : 'Não foi possível ler a capacidade.' }
  const rows = error ? [] : capacityRows(mode === 'demo' ? scenarioLocations : locations, mode === 'demo' ? scenarioStock : stock, entries)
  return <section className="inventory-panel dashboard-panel shelf-capacity" aria-label="Ocupação por capacidade física">
    <h2>Ocupação por capacidade física</h2>
    {!demoOnly && !stockOnly && <label>Dados do gráfico de capacidade<select value={mode} onChange={event => { setMode(event.target.value as CapacityMode); setEditing(null); setMessage('') }}><option value="demo">Apresentação — Norte, Sul, Leste e Oeste</option><option value="stock">Consulta do estoque — capacidades locais</option></select></label>}
    {mode === 'demo' ? <p className="capacity-demo">Prateleiras Norte, Sul, Leste e Oeste.</p> : <p>Usa o saldo normal consultado de amortecedores e molas juntos, independentemente do filtro de categoria. Capacidades reais começam sem preenchimento; exemplos não são copiados para esta consulta.</p>}
    <p>A barra compara caixas registradas com a capacidade informada, usando caixas de tamanho equivalente. Garantia sem localização física não entra neste cálculo. Zero caixas não comprova espaço físico livre.</p>
    <p>{sharedView?'Exibindo planta e capacidades da configuração compartilhada.':'Configuração salva somente nesta conta e navegador; esta cópia local é independente da configuração compartilhada.'}</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {mode === 'demo' && !error && <FictionalShelfMap key={`${userId}:${sharedView}`} userId={userId} canEdit={canEdit} stock={scenarioStock} capacities={entries} baseLayout={presentationData?.floorPlan} sharedView={sharedView}/>}
    <div className="capacity-grid">{rows.map(row => <article className="capacity-card" aria-label={`${mode === 'demo' ? 'Prateleira' : 'Consultada'} ${row.location}`} key={row.location}>
      <h3>{row.location}</h3><p>{row.boxes} caixas {mode === 'demo' ? '' : 'consultadas'}</p>
      {row.capacity ? <>
        <p>Capacidade: {row.capacity.boxes} caixas · {row.capacity.basis.replace("Caixa padrão fictícia", "Caixa padrão")}</p>
        <div className="capacity-track" role="meter" aria-label={`Ocupação de ${row.location}`} aria-valuemin={0} aria-valuemax={row.capacity.boxes} aria-valuenow={Math.min(row.boxes, row.capacity.boxes)} aria-valuetext={`${Math.round(row.percent!)}% — ${row.boxes} de ${row.capacity.boxes} caixas${row.excess ? `; excede em ${row.excess} caixas` : ''}`}><span style={{ width: `${Math.min(100, row.percent!)}%` }}/></div>
        <p><strong>{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(row.percent!)}% da capacidade</strong></p>
        {row.excess > 0 && <p>Acima da capacidade informada em {row.excess} caixas.</p>}
      </> : <p>Capacidade não informada — percentual indisponível.</p>}
      {canEdit && <button className="theme-toggle" type="button" onClick={() => setEditing({ location: row.location, raw, entries })}>Configurar capacidade de {row.location}</button>}
    </article>)}</div>
    {!error && !rows.length && <p>Nenhuma prateleira nesta consulta.</p>}
    {editing && <CapacityEditor location={editing.location} entry={Object.hasOwn(editing.entries, editing.location) ? editing.entries[editing.location] : null} onClose={() => setEditing(null)} onSave={entry => {
      const next = { ...editing.entries }; if (entry) Object.defineProperty(next, editing.location, { value: entry, enumerable: true, configurable: true, writable: true }); else delete next[editing.location]
      saveCapacities(userId, mode, next, editing.raw); setEditing(null); setMessage('Capacidade salva localmente. Nenhum saldo foi alterado.')
    }}/>}
  </section>
}
