import { useState } from 'react'
import type { StockRow } from '../lib/inventory-api'
import type { Capacities } from '../lib/shelf-capacity'
import { suggestSpaces, type StorageRequest } from '../lib/space-suggestions'
import './SpaceSuggestions.css'

export function SpaceSuggestions({ stock, capacities, onSelect }: { stock: StockRow[]; capacities: Capacities; onSelect: (location: string) => void }) {
  const [kind, setKind] = useState<'shock' | 'spring'>('shock')
  const [status, setStatus] = useState<StockRow['status']>('Aguardando testagem')
  const [boxes, setBoxes] = useState('10')
  const [request, setRequest] = useState<StorageRequest | null>(null)
  const [error, setError] = useState('')
  let result: ReturnType<typeof suggestSpaces> | null = null
  try { if (request) result = suggestSpaces(stock, capacities, request) } catch { /* A falha é apresentada sem inventar disponibilidade. */ }
  const closest = result?.excluded.reduce<(typeof result.excluded)[number] | null>((best, row) => {
    if (row.shortfall === null) return best
    return best === null || row.available > best.available ? row : best
  }, null)
  return <section className="space-suggestions" aria-label="Sugestões de espaço">
    <h4>Sugestões de espaço</h4>
    <p>Considera capacidade, padrão de caixa, categoria, situação e espaço conferido. Prateleiras com divergência ficam fora da sugestão. A sugestão não reserva nem transfere caixas.</p>
    <form onSubmit={event => { event.preventDefault(); try { const value: StorageRequest = { kind, status, boxes: Number(boxes), basis: 'Caixa padrão' }; suggestSpaces(stock, capacities, value); setRequest(value); setError('') } catch (caught) { setRequest(null); setError(caught instanceof Error ? caught.message : 'Não foi possível sugerir espaço.') } }}>
      <label>Categoria para armazenar<select value={kind} onChange={event => { const value = event.target.value as 'shock' | 'spring'; setKind(value); setStatus(value === 'spring' ? 'Em estoque' : 'Aguardando testagem'); setRequest(null) }}><option value="shock">Amortecedores</option><option value="spring">Molas</option></select></label>
      <label>Situação para armazenar<select value={status} onChange={event => { setStatus(event.target.value as StockRow['status']); setRequest(null) }}>{(kind === 'spring' ? ['Em estoque'] : ['Aguardando testagem', 'Liberado para venda']).map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Caixas a acomodar<input type="number" min="1" max="2147483647" step="1" required value={boxes} onChange={event => { setBoxes(event.target.value); setRequest(null) }}/></label>
      <p>Padrão de caixa: Caixa padrão</p>
      <button type="submit" className="theme-toggle">Sugerir espaços</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {request && !result && <p role="alert">Não foi possível conferir os dados para sugerir espaço.</p>}
    {result && <>
      <p role="status">{result.suggestions.length ? `${result.suggestions.length} prateleiras comportam todas as ${request!.boxes} caixas nas condições informadas.` : 'Nenhuma prateleira comporta toda a quantidade nas condições informadas.'}</p>
      {result.suggestions.length === 0 && closest && <p>
        Maior espaço compatível: <strong>{closest.location}</strong>, com {closest.available} caixas de capacidade livre conferida. Faltam {closest.shortfall} para acomodar o pedido inteiro.
      </p>}
      <p>Ordem: menor sobra de espaço após acomodar todas as caixas; empate pelo código da prateleira.</p>
      <ol className="space-results">{result.suggestions.map(row => <li key={row.location}><strong>{row.location}</strong><p>Disponível conferido: {row.available} caixas. Sobra após acomodar: {row.remaining} caixas.</p><button type="button" className="theme-toggle" onClick={() => onSelect(row.location)}>Ver {row.location} no mapa</button></li>)}</ol>
      <details><summary>Por que as outras prateleiras não foram sugeridas?</summary><ul>{result.excluded.map(row => <li key={row.location}><strong>{row.location}:</strong> {row.reasons.join('; ')}.</li>)}</ul></details>
    </>}
  </section>
}
