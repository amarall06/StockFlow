import { useEffect, useState } from 'react'
import type { ProductInfo, StockRow } from '../lib/inventory-api'
import { inventoryInsights } from '../lib/inventory-insights'
import { loadInventoryInsights } from '../lib/inventory-insights-api'
import { startResumeRefresh } from '../lib/resume-refresh'
import { isSpringCode } from '../lib/product-category'
import type { DashboardCategory } from '../lib/dashboard-api'
import './InventoryInsights.css'

const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
export function InventoryInsights({ catalog, stock, category }: { catalog: Record<string, ProductInfo>; stock: StockRow[]; category: DashboardCategory }) {
  const [days, setDays] = useState(90)
  const [metric, setMetric] = useState<'operations' | 'boxes'>('operations')
  const [result, setResult] = useState<{ days: number; stockCodes: string; value: Awaited<ReturnType<typeof loadInventoryInsights>> } | null>(null)
  const [error, setError] = useState<{ days: number; stockCodes: string; text: string } | null>(null)
  const stockCodes = JSON.stringify([...new Set(stock.filter(row => row.boxes > 0).map(row => row.code))].sort())
  useEffect(() => {
    let active = true, initial = true
    const load = () => loadInventoryInsights(days, JSON.parse(stockCodes) as string[])
    const apply = (value: Awaited<ReturnType<typeof load>>) => { if (active) { setResult({ days, stockCodes, value }); setError(null) } }
    const fail = () => { if (active) setError({ days, stockCodes, text: 'Não foi possível atualizar a atividade por produto e prateleira.' }) }
    void load().then(apply).catch(fail).finally(() => { initial = false })
    const stop = startResumeRefresh({ load, apply, onError: fail, intervalMs: 30_000, canRefresh: () => !initial && !document.querySelector('dialog[open]') })
    return () => { active = false; stop() }
  }, [days, stockCodes])
  const current = result?.days === days && result.stockCodes === stockCodes ? result.value : null
  const currentError = error?.days === days && error.stockCodes === stockCodes ? error.text : ''
  const belongs = (code: string) => category === 'all' || isSpringCode(code) === (category === 'springs')
  const data = current && inventoryInsights(Object.fromEntries(Object.entries(catalog).filter(([code]) => belongs(code))), stock.filter(row => belongs(row.code)), current.movements.filter(row => row.product && belongs(row.product.code)))
  const quiet = data?.products.filter(row => !row.last) ?? []
  const maximum = Math.max(1, ...data?.locations.map(row => row[metric]) ?? [])
  return <section className="inventory-panel dashboard-panel inventory-insights" aria-label="Atividade por produto e prateleira">
    <h2>Produtos e prateleiras no período</h2>
    <div className="dashboard-tools"><label>Período de atividade<select value={days} onChange={event => setDays(Number(event.target.value))}>{[30, 90, 180, 365].map(value => <option key={value} value={value}>Últimos {value} dias</option>)}</select></label><label>Intensidade do mapa de calor<select value={metric} onChange={event => setMetric(event.target.value as typeof metric)}><option value="operations">Frequência de operações</option><option value="boxes">Caixas movimentadas</option></select></label></div>
    {currentError && <p role="status">{current ? 'Consulta anterior preservada. ' : ''}{currentError}</p>}
    {!current && !currentError && <p role="status">Consultando movimentações do período…</p>}
    {current && data && <>
      <p>Consultado em {date(current.asOf)}. Desde {date(current.start)}. Todas as operações de caixas autorizadas para sua conta, inclusive transferências e testagem.</p>
      <h3>Produtos com saldo sem movimentação no período: {quiet.length}</h3>
      <p>Sem evento neste intervalo não significa idade física das caixas. A última movimentação conhecida inclui o histórico anterior ao período, conforme o acesso da sua conta.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Rolagem dos produtos"><table aria-label="Última movimentação dos produtos com saldo"><thead><tr><th>Produto</th><th>Caixas atuais</th><th>Prateleiras atuais</th><th>Última movimentação conhecida</th></tr></thead><tbody>{data.products.map(row => <tr key={row.code}><td>{row.code}</td><td>{row.boxes}</td><td>{row.locations.join(', ')}</td><td>{row.last ? date(row.last) : <>{current.previous[row.code] ? date(current.previous[row.code]!) : 'Sem histórico disponível'}<br />Sem movimentação no período</>}</td></tr>)}</tbody></table></div>
      {!data.products.length && <p>Nenhum produto com saldo normal nesta categoria.</p>}
      <h3>Mapa de calor por prateleira</h3><p>Intensidade relativa ao maior valor da consulta, sem representar capacidade física. Transferências contam uma operação e suas caixas em cada local envolvido; o volume não é saldo líquido. Divergências ainda não incluídas.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Rolagem das prateleiras"><table aria-label="Mapa de calor por prateleira"><thead><tr><th>Prateleira</th><th>Operações</th><th>Caixas movimentadas</th><th>Última no período</th><th>Intensidade relativa</th></tr></thead><tbody>{data.locations.map(row => <tr key={row.code}><td>{row.code}</td><td>{row.operations}</td><td>{row.boxes}</td><td>{row.last ? date(row.last) : 'Sem evento no período'}</td><td><meter min={0} max={maximum} value={row[metric]} aria-label={`Intensidade de ${row.code}`} /> {Math.round(row[metric] / maximum * 100)}%</td></tr>)}</tbody></table></div>
      {!data.locations.length && <p>Nenhuma prateleira nesta consulta.</p>}
    </>}
  </section>
}
