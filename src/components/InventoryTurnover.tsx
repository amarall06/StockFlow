import {useEffect,useId,useMemo,useRef,useState} from 'react'
import type {ProductInfo} from '../lib/inventory-api'
import {loadTurnover} from '../lib/turnover-api'
import {daysWithoutSale,rankTurnover,type AbcClass,type RankedProduct,type TurnoverCategory,type TurnoverDays,type TurnoverReport} from '../lib/turnover'
import {ProductPhoto} from './ProductPhotos'
import {ProductApplications} from './ProductApplications'
import {searchableProductText} from '../lib/product-details'
import {ExportCsvButton} from './ExportCsvButton'
import './InventoryTurnover.css'

const format=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2})
const dateFormat=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bahia'})
const labels:Record<AbcClass,string>={A:'Classe A',B:'Classe B',C:'Classe C',none:'Sem vendas'}

export function TurnoverChart({rows}:{rows:RankedProduct[]}){
  const titleId=useId(),descriptionId=useId()
  const visible=rows.filter(row=>row.sold_boxes>0).slice(0,10)
  if(!visible.length)return <p className="turnover-empty">Ainda não há vendas registradas neste período e categoria.</p>
  const maximum=Math.max(...visible.map(row=>row.sold_boxes))
  const step=650/visible.length
  const x=(index:number)=>45+step*index+step/2
  const y=(percent:number)=>195-percent*1.6
  return <div className="turnover-chart-scroll"><svg viewBox="0 0 760 245" role="img" aria-labelledby={`${titleId} ${descriptionId}`} className="turnover-chart">
    <title id={titleId}>Caixas vendidas e participação acumulada dos dez códigos com mais vendas</title>
    <desc id={descriptionId}>Barras representam caixas; a linha representa o percentual acumulado considerando todos os produtos da seleção. Os valores também estão na tabela abaixo.</desc>
    {[0,50,80,100].map(percent=><g key={percent}><line x1="40" x2="705" y1={y(percent)} y2={y(percent)} className={percent===80?'turnover-guide':'turnover-gridline'}/><text x="715" y={y(percent)+4}>{percent}%</text></g>)}
    {visible.map((row,index)=><g key={row.code}><rect x={x(index)-Math.min(step*.3,24)} y={195-row.sold_boxes/maximum*145} width={Math.min(step*.6,48)} height={row.sold_boxes/maximum*145} rx="3" className={`turnover-bar turnover-bar-${row.abc}`}/><text x={x(index)} y="23" textAnchor="middle">{format.format(row.sold_boxes)}</text><text x={x(index)} y="222" textAnchor="middle">{row.code}</text></g>)}
    <polyline points={visible.map((row,index)=>`${x(index)},${y(row.cumulative)}`).join(' ')} className="turnover-line"/>
    {visible.map((row,index)=><circle key={row.code} cx={x(index)} cy={y(row.cumulative)} r="3" className="turnover-dot"/>)}
  </svg></div>
}

export function TurnoverResults({report,catalog}:{report:TurnoverReport;catalog:Record<string,ProductInfo>}){
  const [search,setSearch]=useState('')
  const [classification,setClassification]=useState<AbcClass|'all'>('all')
  const [onlyIdle,setOnlyIdle]=useState(false)
  const detailsRef=useRef<HTMLElement>(null)
  // Calcula antes de filtrar a tabela: buscar um código não deve mudar sua classificação.
  const rows=useMemo(()=>rankTurnover(report),[report])
  const sold=rows.reduce((sum,row)=>sum+row.sold_boxes,0)
  const idle=rows.filter(row=>row.stock_boxes>0&&row.sold_boxes===0)
  const term=search.trim().toLocaleLowerCase('pt-BR')
  const filtered=rows.filter(row=>(classification==='all'||row.abc===classification)&&(!onlyIdle||row.stock_boxes>0&&row.sold_boxes===0)
    &&`${row.code} ${searchableProductText(catalog[row.code])}`.toLocaleLowerCase('pt-BR').includes(term))
  return <>
    <section className="turnover-summary" aria-label="Resumo das vendas"><div><span>Caixas vendidas</span><strong>{format.format(sold)}</strong><small>Últimos {report.days} dias</small></div><div><span>Produtos com vendas</span><strong>{rows.filter(row=>row.sold_boxes>0).length}</strong><small>De {rows.length} códigos na seleção</small></div><button type="button" onClick={()=>{setOnlyIdle(true);setClassification('none');detailsRef.current?.focus({preventScroll:true});detailsRef.current?.scrollIntoView({block:'start'})}}><span>Com estoque e sem vendas</span><strong>{idle.length}</strong><small>Ver produtos no período ↗</small></button></section>
    <section className="inventory-panel turnover-panel"><div className="turnover-section-heading"><div><h2>Participação nas vendas</h2><p>Caixas vendidas por produto e percentual acumulado.</p></div><span className="turnover-legend"><i/> Caixas <b/> Acumulado</span></div><TurnoverChart rows={rows}/><p className="turnover-note">A: grupo inicial até atingir 80% das caixas; B: próximo grupo até 95%; C: restante. Empates ficam na mesma classe, por isso os limites podem ser ultrapassados. Produtos sem vendas não entram na ABC.</p></section>
    <section ref={detailsRef} tabIndex={-1} aria-label="Detalhamento do giro por produto" className="inventory-panel turnover-panel"><div className="turnover-section-heading"><div><h2>Giro por produto</h2><p>Média diária de caixas vendidas no período, sem estimativa financeira.</p></div><ExportCsvButton name="liber-giro-abc" headers={['Consulta em (ISO)','Início do período (ISO)','Dias','Categoria selecionada','Código','Aplicação','Classe','Caixas vendidas','Participação (%)','Acumulado (%)','Caixas por dia','Estoque atual (caixas)','Última venda (ISO)']} rows={filtered.map(row=>[report.as_of,report.period_start,report.days,report.category==='all'?'Amortecedores e molas':report.category==='shocks'?'Amortecedores':'Molas',row.code,searchableProductText(catalog[row.code]),labels[row.abc],row.sold_boxes,row.abc==='none'?null:row.share,row.abc==='none'?null:row.cumulative,row.daily,row.stock_boxes,row.last_sale_at])}/><span className="turnover-result-count">{filtered.length} produtos</span></div>
      <div className="turnover-table-tools"><label>Buscar código ou aplicação<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Ex.: AGM-35 ou Corsa"/></label><label>Classificação<select value={classification} onChange={event=>setClassification(event.target.value as AbcClass|'all')}><option value="all">Todas</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="turnover-check"><input type="checkbox" checked={onlyIdle} onChange={event=>setOnlyIdle(event.target.checked)}/> Somente estoque sem vendas no período</label></div>
      {!filtered.length?<p className="turnover-empty">Nenhum produto corresponde aos filtros selecionados.</p>:<div className="turnover-table-scroll" tabIndex={0} role="region" aria-label="Tabela de giro com rolagem horizontal"><table className="turnover-table"><caption className="sr-only">Vendas, classificação ABC e última venda por código</caption><thead><tr><th>Produto</th><th>Classe</th><th>Vendidas</th><th>Participação</th><th>Acumulado</th><th>Caixas/dia</th><th>Estoque atual</th><th>Última venda</th></tr></thead><tbody>{filtered.map(row=>{const days=daysWithoutSale(row,report.as_of);return <tr key={row.code}><td><div className="turnover-product"><ProductPhoto code={row.code}/><div><strong>{row.code}</strong><ProductApplications product={catalog[row.code]}/></div></div></td><td><span className={`abc-badge abc-${row.abc}`}>{row.abc==='none'?'Sem vendas':row.abc}</span></td><td>{format.format(row.sold_boxes)}</td><td>{row.abc==='none'?'—':`${format.format(row.share)}%`}</td><td>{row.abc==='none'?'—':`${format.format(row.cumulative)}%`}</td><td>{format.format(row.daily)}</td><td>{format.format(row.stock_boxes)}</td><td>{row.last_sale_at?<><time dateTime={row.last_sale_at}>{dateFormat.format(new Date(row.last_sale_at))}</time><small>{days===0?'Hoje':`${days} ${days===1?'dia':'dias'} sem venda registrada`}</small></>:<span>Sem venda registrada</span>}</td></tr>})}</tbody></table></div>}
      <p className="turnover-mobile-hint">Deslize a tabela para ver todas as colunas.</p><p className="turnover-note">Estoque normal inclui amortecedores aguardando teste e liberados, além de molas em estoque; garantia fica fora. Sem venda registrada não significa idade física da peça. Transferências, descartes e devoluções não contam como venda.</p>
    </section>
  </>
}

export function InventoryTurnover({catalog,ready,onRefresh}:{catalog:Record<string,ProductInfo>;ready:boolean;onRefresh:()=>Promise<void>}){
  const [category,setCategory]=useState<TurnoverCategory>('all')
  const [days,setDays]=useState<TurnoverDays>(90)
  const [revision,setRevision]=useState(0)
  const [updating,setUpdating]=useState(false)
  const [refreshError,setRefreshError]=useState('')
  const key=`${category}:${days}:${revision}`
  const [result,setResult]=useState<{key:string;report:TurnoverReport|null;error:string}>({key:'',report:null,error:''})
  const loading=ready&&result.key!==key
  useEffect(()=>{
    if(!ready)return
    let current=true
    void loadTurnover(category,days).then(report=>{if(current)setResult({key,report,error:''})})
      .catch(error=>{if(current)setResult({key,report:null,error:error instanceof Error?error.message:'Não foi possível consultar os indicadores.'})})
    return()=>{current=false}
  },[category,days,key,ready])
  async function refresh(){
    if(updating||loading)return
    setUpdating(true);setRefreshError('')
    try{await onRefresh();setRevision(value=>value+1)}catch{setRefreshError('Não foi possível atualizar. Confira a conexão e tente novamente.')}
    finally{setUpdating(false)}
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">MOVIMENTO DO ESTOQUE</p><h1>Giro e Curva ABC</h1><p className="subtitle">Identifique os códigos com mais vendas e o estoque sem saídas de venda no período.</p></div></div>
    <section className="inventory-panel turnover-panel"><div className="turnover-controls"><label>Categoria<select value={category} disabled={updating} onChange={event=>setCategory(event.target.value as TurnoverCategory)}><option value="all">Amortecedores e molas</option><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label><label>Período<select value={days} disabled={updating} onChange={event=>setDays(Number(event.target.value) as TurnoverDays)}><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={180}>Últimos 180 dias</option></select></label><button type="button" className="theme-toggle" disabled={loading||updating} onClick={()=>void refresh()}>{loading||updating?'Consultando…':'Atualizar indicadores'}</button></div>
      <p className="turnover-note">Classificação por quantidade de caixas vendidas. Não usa faturamento, custos ou saldo médio.</p>
      {refreshError&&<p role="alert" className="auth-error">{refreshError}</p>}
    </section>
    {!ready?<section className="inventory-panel turnover-panel"><p role="status">Os indicadores ainda não estão disponíveis. Atualize para conferir novamente.</p></section>:loading?<p role="status">Consultando vendas e estoque…</p>:result.error?<p role="alert" className="auth-error">{result.error}</p>:result.report&&<><p className="turnover-as-of">Consulta em {dateFormat.format(new Date(result.report.as_of))} · Período desde {dateFormat.format(new Date(result.report.period_start))}</p><TurnoverResults key={key} report={result.report} catalog={catalog}/></>}
  </>
}
