import { useEffect, useState, type RefObject } from 'react'
import { startResumeRefresh } from '../lib/resume-refresh'
import { loadActivity, type ActivityDay } from '../lib/activity-api'
import type { DashboardCategory } from '../lib/dashboard-api'
const date = (day: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(day+'T12:00:00Z'))

export function ActivityChart({ rows }: { rows: ActivityDay[] }) {
  const [compact,setCompact]=useState(()=>matchMedia('(max-width:650px)').matches)
  useEffect(()=>{const media=matchMedia('(max-width:650px)'),update=()=>setCompact(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
  const [series,setSeries] = useState<'sold_boxes'|'received_boxes'>('sold_boxes')
  const [chartType,setChartType] = useState<'bars'|'line'>('bars')
  const [selected,setSelected] = useState(0)
  const current = rows[Math.min(selected, rows.length-1)]
  const maximum = Math.max(1,...rows.map(row=>row[series]))
  const left=compact?32:60,right=compact?310:580,bottom=compact?150:190,top=30,range=bottom-top
  const pointX = (index: number) => left+(index+.5)/Math.max(1,rows.length)*(right-left)
  const points = rows.map((row,index)=>`${pointX(index)},${bottom-row[series]/maximum*range}`).join(' ')
  const title = series === 'sold_boxes' ? 'Vendas' : 'Entradas'
  return <>
    <svg className="activity-chart" viewBox={`0 0 ${compact?320:600} ${compact?180:220}`} role="img" aria-label={`${title} em caixas por dia; os valores também estão na tabela abaixo`}>
      {[...new Set([0,1,2,3,4].map(n=>Math.round(maximum*n/4)))].map(n=><g key={n}><path d={`M${left} ${bottom-n/maximum*range}H${right}`} stroke="currentColor" opacity=".12"/><text x={left-10} y={bottom+4-n/maximum*range} textAnchor="end" fill="currentColor" fontSize="12">{n}</text></g>)}
      <path d={`M${left} 25V${bottom}H${right}`} stroke="currentColor" fill="none" opacity=".3" />
      <text x="20" y="18" fill="currentColor" fontSize="12">{maximum} cx.</text>
      <g className="activity-chart-series" key={`${chartType}:${series}`}>
      {chartType==='line'?<polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />:rows.map((row,index)=><rect key={row.day} x={left+(index+.18)/rows.length*(right-left)} y={bottom-row[series]/maximum*range} width={Math.max(1,(right-left)/rows.length*.64)} height={row[series]/maximum*range} rx="3" fill="currentColor"><title>{date(row.day)}: {row[series]} caixas</title></rect>)}
      {current && chartType==='line' && <circle cx={pointX(Math.min(selected,rows.length-1))} cy={bottom-current[series]/maximum*range} r="5" fill="currentColor" />}
      </g>
      {rows.length>0 && (rows.length<=7?rows.map((row,index)=><text key={row.day} x={pointX(index)} y={bottom+20} textAnchor="middle" fill="currentColor" fontSize="12">{date(row.day)}</text>):<><text x={left} y={bottom+20} fill="currentColor" fontSize="12">{date(rows[0].day)}</text><text x={right} y={bottom+20} textAnchor="end" fill="currentColor" fontSize="12">{date(rows.at(-1)!.day)}</text></>)}
    </svg>

    <details className="activity-options"><summary title="Opções do gráfico"><span aria-hidden="true">⋯</span><span className="ui-sr-only">Opções do gráfico</span></summary><div className="activity-options-content"><div className="activity-chart-controls"><label className="activity-filter">Mostrar<select aria-label="Série do gráfico" value={series} onChange={event=>setSeries(event.target.value as typeof series)}><option value="sold_boxes">Vendas</option><option value="received_boxes">Entradas</option></select></label>
    <label className="activity-filter">Visualização<select aria-label="Visualização do gráfico" value={chartType} onChange={event=>setChartType(event.target.value as typeof chartType)}><option value="bars">Barras</option><option value="line">Linhas</option></select></label></div>
    <details className="activity-values"><summary>Ver tabela de valores</summary>
    <p>{rows.reduce((sum,row)=>sum+row[series],0)} caixas · {title.toLowerCase()} no período selecionado.</p>
{current && <label className="activity-day">Consultar dia<input aria-label="Dia do gráfico" type="range" min="0" max={rows.length-1} value={Math.min(selected,rows.length-1)} onChange={event=>setSelected(Number(event.target.value))}/><output aria-live="polite">{date(current.day)}: {current[series]} caixas</output></label>}<table><thead><tr><th>Dia</th><th>Vendas (cx.)</th><th>Entradas (cx.)</th></tr></thead><tbody>{rows.map(row=><tr key={row.day}><td>{date(row.day)}</td><td>{row.sold_boxes}</td><td>{row.received_boxes}</td></tr>)}</tbody></table></details></div></details>
  </>
}
export function InventoryActivity({ category, revision, pauseRef }: { category: DashboardCategory; revision: number; pauseRef?: RefObject<boolean> }) {
  const [days,setDays] = useState(7)
  const key = `${category}:${days}:${revision}`
  const [result,setResult] = useState<{key:string;rows:ActivityDay[];error:string}>({key:'',rows:[],error:''})
  const [automaticError,setAutomaticError] = useState({key:'',message:''})
  useEffect(()=>{
    let current=true
    let initialPending=true
    let hasReport=false
    function publish(rows:ActivityDay[]){
      if(!current)return
      hasReport=true
      setResult({key,rows,error:''})
      setAutomaticError({key,message:''})
    }
    void loadActivity(category,days).then(publish)
      .catch(error=>{if(current)setResult({key,rows:[],error:error instanceof Error?error.message:'Não foi possível consultar a atividade.'})})
      .finally(()=>{initialPending=false})
    const stop=startResumeRefresh({
      intervalMs:30_000,load:()=>loadActivity(category,days),apply:publish,
      canRefresh:()=>!initialPending&&!pauseRef?.current&&!document.querySelector('dialog[open]'),
      onError:()=>{
        if(hasReport)setAutomaticError({key,message:'Não foi possível atualizar a atividade diária automaticamente. Os dados da consulta anterior permanecem na tela.'})
        else setResult({key,rows:[],error:'Não foi possível consultar a atividade. Atualize os indicadores para tentar novamente.'})
      },
    })
    return ()=>{current=false;stop()}
  },[category,days,key,pauseRef])
  return <section className="inventory-panel dashboard-panel activity-panel" aria-label="Atividade diária">
    <h2>Movimentação de estoque</h2><p className="activity-description">Dias do calendário na Bahia, incluindo hoje, que ainda pode estar incompleto. Somente movimentos registrados; transferências e garantia ficam fora.</p>
    <label className="activity-filter">Período<select aria-label="Período do gráfico" value={days} onChange={event=>setDays(Number(event.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></label>
    {automaticError.key===key&&automaticError.message&&<p className="auth-error" role="status">{automaticError.message}</p>}
    {result.key!==key?<p role="status">Carregando atividade…</p>:result.error?<p className="auth-error" role="alert">{result.error}</p>:<ActivityChart key={key} rows={result.rows}/>}
  </section>
}
