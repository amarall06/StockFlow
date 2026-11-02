import { useRef, useState } from 'react'
import type { StockRow } from '../lib/inventory-api'
import type { Capacities } from '../lib/shelf-capacity'
import { fictionalShelfMap } from '../lib/shelf-map'
import './FictionalShelfMap.css'

export function FictionalShelfMap({ stock, capacities }: { stock: StockRow[]; capacities: Capacities }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const { shelves, normalized, matches } = fictionalShelfMap(stock, query)
  const current = shelves.find(row => row.location === selected)
  const capacity = current && Object.hasOwn(capacities, current.location) ? capacities[current.location] : null
  return <section className="fictional-shelf-map" aria-label="Mapa fictício das prateleiras">
    <h3>Mapa fictício — Norte, Sul, Leste e Oeste</h3>
    <p>Desenho demonstrativo: Norte acima, Sul abaixo, Oeste à esquerda e Leste à direita. Não representa a planta real da empresa. Clique ou use Tab e Enter para consultar cada prateleira.</p>
    <label>Buscar produto no mapa fictício<input type="search" maxLength={60} value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: AGM-35 ou MGM-35"/></label>
    {query && <button type="button" className="theme-toggle" onClick={() => setQuery('')}>Limpar busca do mapa</button>}
    <p role="status">{normalized ? matches.length ? `Produto encontrado em ${matches.length} prateleiras fictícias: ${matches.map(row => row.location).join(', ')}.` : 'Nenhum produto encontrado no mapa fictício. As prateleiras continuam mostrando seus saldos completos.' : 'Digite um código ou parte dele para destacar todas as prateleiras correspondentes.'}</p>
    <ul className="map-legend" aria-label="Legenda do mapa fictício"><li>Ocupada no exemplo: há caixas registradas.</li><li>Sem caixas no exemplo: saldo zero, sem comprovação de espaço livre real.</li><li>Divergência fictícia: contagem de exemplo difere da referência.</li><li>Produto encontrado: destaque também identificado por texto.</li></ul>
    <div className="fictional-map" role="group" aria-label="Disposição demonstrativa das prateleiras">
      {shelves.map(row => <button type="button" key={row.location} ref={element => { if (element) buttons.current.set(row.location, element); else buttons.current.delete(row.location) }}
        className={`map-shelf map-${row.location.toLowerCase()}${row.count ? ' map-divergent' : row.boxes === 0 ? ' map-empty' : ' map-occupied'}${row.matchedBoxes ? ' map-match' : ''}`}
        aria-label={`Prateleira ${row.location} — ${row.state}${row.matchedBoxes ? ` — produto encontrado: ${row.matchedBoxes} caixas` : ''}`} aria-pressed={selected === row.location} aria-controls="fictional-map-details" onClick={() => setSelected(value => value === row.location ? null : row.location)}>
        <strong>{row.location}</strong><span>{row.boxes} caixas fictícias</span><span>{row.state}</span>
        {row.matchedBoxes > 0 && <strong>Produto encontrado: {row.matchedBoxes} caixas</strong>}
        {selected === row.location && <span>Selecionada</span>}
      </button>)}
      <div className="map-corridor" aria-hidden="true">Corredor<br/>fictício</div>
    </div>
    <div id="fictional-map-details" role="region" aria-label="Detalhes da prateleira fictícia" className="map-details">
      {current ? <>
        <h4>Prateleira {current.location} — dados fictícios</h4>
        <p>Saldo completo: {current.boxes} caixas. {capacity ? `Capacidade fictícia configurada: ${capacity.boxes} caixas, referência ${capacity.basis}.` : 'Capacidade não informada.'}</p>
        {current.count && <p><strong>Divergência de contagem fictícia:</strong> referência {current.count.reference}, contado {current.count.counted}, faltam {current.count.reference - current.count.counted} caixas. Este exemplo não é conferência aprovada nem corresponde ao excesso de capacidade.</p>}
        {current.rows.length ? <div className="map-table-scroll" role="region" aria-label="Rolagem dos produtos da prateleira fictícia" tabIndex={0}><table aria-label={`Produtos fictícios de ${current.location}`}><thead><tr><th>Produto</th><th>Situação</th><th>Caixas</th></tr></thead><tbody>{current.rows.map((row, index) => <tr key={`${row.code}:${row.status}:${index}`}><td>{row.code}</td><td>{row.status}</td><td>{row.boxes}</td></tr>)}</tbody></table></div> : <p>Nenhuma caixa registrada nesta prateleira do exemplo. Não é uma recomendação de armazenamento real.</p>}
        <button type="button" className="theme-toggle" onClick={() => { setSelected(null); if (selected) buttons.current.get(selected)?.focus() }}>Fechar detalhes do mapa</button>
      </> : <p>Selecione uma prateleira para consultar seus produtos e situações.</p>}
    </div>
  </section>
}
