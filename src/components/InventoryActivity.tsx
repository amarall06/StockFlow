import { useEffect, useState } from 'react'
import { loadActivity, type ActivityDay } from '../lib/activity-api'
import type { DashboardCategory } from '../lib/dashboard-api'
const date = (day: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(day+'T12:00:00Z'))

export function ActivityChart({ rows }: { rows: ActivityDay[] }) {
  const [series,setSeries] = useState<'sold_boxes'|'received_boxes'>('sold_boxes')
  const [chartType,setChartType] = useState<'bars'|'line'>('bars')
  const [selected,setSelected] = useState(0)
  const current = rows[Math.min(selected, rows.length-1)]
  const maximum = Math.max(1,...rows.map(row=>row[series]))
  const points = rows.map((row,index)=>`${20+index/Math.max(1,rows.length-1)*560},${150-row[series]/maximum*120}`).join(' ')
  const title = series === 'sold_boxes' ? 'Vendas' : 'Entradas'
  return <>
    <svg className="activity-chart" viewBox="0 0 600 180" role="img" aria-label={`${title} em caixas por dia; os valores também estão na tabela abaixo`}>
      {[...new Set([0,1,2,3,4].map(n=>Math.round(maximum*n/4)))].map(n=><g key={n}><path d={`M40 ${150-n/maximum*120}H580`} stroke="currentColor" opacity=".12"/><text x="30" y={154-n/maximum*120} textAnchor="end" fill="currentColor" fontSize="11">{n}</text></g>)}
      <path d="M40 25V150H580" stroke="currentColor" fill="none" opacity=".3" />
      <text x="20" y="18" fill="currentColor" fontSize="12">{maximum} cx.</text>
      {chartType==='line'?<polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />:rows.map((row,index)=><rect key={row.day} x={45+index/rows.length*535+4} y={150-row[series]/maximum*120} width={Math.max(1,535/rows.length-8)} height={row[series]/maximum*120} rx="3" fill="currentColor"><title>{date(row.day)}: {row[series]} caixas</title></rect>)}
      {current && chartType==='line' && <circle cx={20+Math.min(selected,rows.length-1)/Math.max(1,rows.length-1)*560} cy={150-current[series]/maximum*120} r="5" fill="currentColor" />}
      {rows.length>0 && (rows.length<=7?rows.map((row,index)=><text key={row.day} x={45+(index+.5)/rows.length*535} y="170" textAnchor="middle" fill="currentColor" fontSize="11">{date(row.day)}</text>):<><text x="40" y="174" fill="currentColor" fontSize="12">{date(rows[0].day)}</text><text x="580" y="174" textAnchor="end" fill="currentColor" fontSize="12">{date(rows.at(-1)!.day)}</text></>)}
    </svg>

    <div className="activity-chart-controls"><label className="activity-filter">Mostrar<select aria-label="Série do gráfico" value={series} onChange={event=>setSeries(event.target.value as typeof series)}><option value="sold_boxes">Vendas</option><option value="received_boxes">Entradas</option></select></label>
    <label className="activity-filter">Visualização<select aria-label="Visualização do gráfico" value={chartType} onChange={event=>setChartType(event.target.value as typeof chartType)}><option value="bars">Barras</option><option value="line">Linhas</option></select></label></div>
    <details className="activity-values"><summary>Ver tabela de valores</summary>
    <p>{rows.reduce((sum,row)=>sum+row[series],0)} caixas · {title.toLowerCase()} no período selecionado.</p>
{current && <label className="activity-day">Consultar dia<input aria-label="Dia do gráfico" type="range" min="0" max={rows.length-1} value={Math.min(selected,rows.length-1)} onChange={event=>setSelected(Number(event.target.value))}/><output aria-live="polite">{date(current.day)}: {current[series]} caixas</output></label>}<table><thead><tr><th>Dia</th><th>Vendas (cx.)</th><th>Entradas (cx.)</th></tr></thead><tbody>{rows.map(row=><tr key={row.day}><td>{date(row.day)}</td><td>{row.sold_boxes}</td><td>{row.received_boxes}</td></tr>)}</tbody></table></details>
  </>
}
export function InventoryActivity({ category, revision }: { category: DashboardCategory; revision: number }) {
  const [days,setDays] = useState(7)
  const key = `${category}:${days}:${revision}`
  const [result,setResult] = useState<{key:string;rows:ActivityDay[];error:string}>({key:'',rows:[],error:''})
  useEffect(()=>{
    let current=true
    void loadActivity(category,days).then(rows=>{if(current)setResult({key,rows,error:''})}).catch(error=>{if(current)setResult({key,rows:[],error:error instanceof Error?error.message:'Não foi possível consultar a atividade.'})})
    return ()=>{current=false}
  },[category,days,key])
  return <section className="inventory-panel dashboard-panel activity-panel" aria-label="Atividade diária">
    <h2>Movimentação de estoque</h2><p className="activity-description">Dias do calendário na Bahia, incluindo hoje, que ainda pode estar incompleto. Somente movimentos registrados; transferências e garantia ficam fora.</p>
    <label className="activity-filter">Período<select aria-label="Período do gráfico" value={days} onChange={event=>setDays(Number(event.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></label>
    {result.key!==key?<p role="status">Carregando atividade…</p>:result.error?<p className="auth-error" role="alert">{result.error}</p>:<ActivityChart key={key} rows={result.rows}/>}
  </section>
}
