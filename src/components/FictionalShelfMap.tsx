import { useRef, useState } from 'react'
import type { StockRow } from '../lib/inventory-api'
import type { Capacities } from '../lib/shelf-capacity'
import { fictionalShelfMap } from '../lib/shelf-map'
import './FictionalShelfMap.css'
import { SpaceSuggestions } from './SpaceSuggestions'
import { FloorRackEditor } from './FloorRackEditor'
import { floorGrid, floorPlanKey, initialFloorPlan, parseFloorPlan, saveFloorPlan, validateFloorPlan, type FloorPlan } from '../lib/floor-plan'

export function FictionalShelfMap({ stock, capacities, userId, canEdit }: { stock: StockRow[]; capacities: Capacities; userId: string; canEdit: boolean }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const viewport = useRef<HTMLDivElement>(null)
  const [saved] = useState(() => { try { const raw = localStorage.getItem(floorPlanKey(userId)); return { raw, layout: parseFloorPlan(raw, userId), error: '' } } catch { return { raw: null, layout: structuredClone(initialFloorPlan), error: 'Não foi possível ler a planta salva. Os dados foram preservados; gravação bloqueada.' } } })
  const originalRaw = useRef(saved.raw)
  const [layout, setLayout] = useState<FloorPlan>(saved.layout)
  const [zoom, setZoom] = useState(0.75)
  const [feedback, setFeedback] = useState({ text: '', error: false })
  const { shelves, normalized, matches } = fictionalShelfMap(stock, query)
  const current = shelves.find(row => row.location === selected)
  const capacity = current && Object.hasOwn(capacities, current.location) ? capacities[current.location] : null
  return <section className="fictional-shelf-map" aria-label="Mapa de prateleiras">
    <h3>Mapa — Norte, Sul, Leste e Oeste</h3>
    <p>Norte acima, Sul abaixo, Oeste à esquerda e Leste à direita. Clique ou use Tab e Enter para consultar cada prateleira.</p>
    <label>Buscar produto no mapa<input type="search" maxLength={60} value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: AGM-35 ou MGM-35"/></label>
    {query && <button type="button" className="theme-toggle" onClick={() => setQuery('')}>Limpar busca do mapa</button>}
    <p role="status">{normalized ? matches.length ? `Produto encontrado em ${matches.length} prateleiras: ${matches.map(row => row.location).join(', ')}.` : 'Nenhum produto encontrado no mapa. As prateleiras continuam mostrando seus saldos completos.' : 'Digite um código ou parte dele para destacar todas as prateleiras correspondentes.'}</p>
    <ul className="map-legend" aria-label="Legenda do mapa"><li>Ocupada: há caixas registradas.</li><li>Sem caixas: saldo zero, sem comprovação de espaço livre real.</li><li>Divergência de contagem: contagem difere da referência.</li><li>Produto encontrado: destaque também identificado por texto.</li></ul>
    <SpaceSuggestions stock={stock} capacities={capacities} onSelect={location => { setSelected(location); buttons.current.get(location)?.focus() }}/>
    <div className="floor-toolbar" role="group" aria-label="Controles da planta">
      <button type="button" className="theme-toggle" disabled={zoom >= 1.5} onClick={() => setZoom(value => Math.min(1.5, value + 0.25))}>Ampliar planta</button>
      <button type="button" className="theme-toggle" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.25))}>Reduzir planta</button>
      <button type="button" className="theme-toggle" onClick={() => setZoom(Math.max(0.5, Math.min(1.5, ((viewport.current?.clientWidth ?? 720) - 24) / 960)))}>Ajustar visualização</button>
      <span aria-label="Nível de zoom">{Math.round(zoom * 100)}%</span>
      {canEdit && <><button type="button" className="theme-toggle" disabled={Boolean(saved.error)} onClick={() => { try { originalRaw.current = saveFloorPlan(userId, layout, originalRaw.current); setFeedback({ text: 'Planta salva neste navegador.', error: false }) } catch (caught) { setFeedback({ text: caught instanceof Error ? caught.message : 'Não foi possível salvar.', error: true }) } }}>Salvar planta local</button><button type="button" className="theme-toggle" onClick={() => { setLayout(structuredClone(initialFloorPlan)); setSelected(null); setFeedback({ text: 'Posições padrão aplicadas. Salve a planta para conservar.', error: false }) }}>Restaurar posições</button></>}
    </div>
    {saved.error && <p role="alert">{saved.error}</p>}{feedback.text && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    <div className="floor-workspace">
    <div ref={viewport} className="floor-viewport" tabIndex={0} role="region" aria-label="Área da planta com rolagem">
    <div className="floor-stage" style={{ width: 960 * zoom, height: 640 * zoom }}>
    <div className="fictional-map" role="group" aria-label="Disposição das prateleiras" style={{ transform: `scale(${zoom})` }}>
      <div className="floor-aisle floor-aisle-vertical" aria-hidden="true">Corredor principal</div><div className="floor-aisle floor-aisle-horizontal" aria-hidden="true"/>
      <div className="floor-zone floor-receiving">Recebimento</div><div className="floor-zone floor-dispatch">Expedição</div>
      {shelves.map(row => <button type="button" key={row.location} ref={element => { if (element) buttons.current.set(row.location, element); else buttons.current.delete(row.location) }}
        className={`map-shelf map-${row.location.toLowerCase()}${row.count ? ' map-divergent' : row.boxes === 0 ? ' map-empty' : ' map-occupied'}${row.matchedBoxes ? ' map-match' : ''}`}
        style={{ left: layout[row.location].x * floorGrid.cell, top: layout[row.location].y * floorGrid.cell, width: layout[row.location].width * floorGrid.cell, height: layout[row.location].height * floorGrid.cell }}
        aria-label={`Prateleira ${row.location} — ${row.state}${row.matchedBoxes ? ` — produto encontrado: ${row.matchedBoxes} caixas` : ''}`} aria-pressed={selected === row.location} aria-controls="fictional-map-details" onClick={() => setSelected(value => value === row.location ? null : row.location)}>
        <strong>{row.location}</strong><span>{row.boxes} caixas</span><span>{row.state}</span>
        {row.matchedBoxes > 0 && <strong>Produto encontrado: {row.matchedBoxes} caixas</strong>}
        {selected === row.location && <span>Selecionada</span>}
      </button>)}
    </div></div></div>
    <div id="fictional-map-details" role="region" aria-label="Detalhes da prateleira" className="map-details">
      {current ? <>
        <h4>Prateleira {current.location} — detalhes</h4>
        {canEdit && !saved.error && <FloorRackEditor key={current.location} location={current.location} initial={layout[current.location]} onApply={position => { const next = { ...layout, [current.location]: position }; validateFloorPlan(next); setLayout(next); setFeedback({ text: 'Posição aplicada. Salve a planta para conservar.', error: false }) }}/>}
        <p>Saldo completo: {current.boxes} caixas. {capacity ? `Capacidade configurada: ${capacity.boxes} caixas, referência ${capacity.basis.replace("Caixa padrão fictícia", "Caixa padrão")}.` : 'Capacidade não informada.'}</p>
        {current.count && <p><strong>Divergência de contagem:</strong> referência {current.count.reference}, contado {current.count.counted}, faltam {current.count.reference - current.count.counted} caixas. A diferença de contagem não corresponde ao excesso de capacidade.</p>}
        {current.rows.length ? <div className="map-table-scroll" role="region" aria-label="Rolagem dos produtos da prateleira" tabIndex={0}><table aria-label={`Produtos de ${current.location}`}><thead><tr><th>Produto</th><th>Situação</th><th>Caixas</th></tr></thead><tbody>{current.rows.map((row, index) => <tr key={`${row.code}:${row.status}:${index}`}><td>{row.code}</td><td>{row.status}</td><td>{row.boxes}</td></tr>)}</tbody></table></div> : <p>Nenhuma caixa registrada nesta prateleira.</p>}
        <button type="button" className="theme-toggle" onClick={() => { setSelected(null); if (selected) buttons.current.get(selected)?.focus() }}>Fechar detalhes do mapa</button>
      </> : <p>Selecione uma prateleira para consultar seus produtos e situações.</p>}
    </div></div>
  </section>
}
