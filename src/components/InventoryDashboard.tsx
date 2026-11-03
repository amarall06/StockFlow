import {useEffect,useRef,useState} from 'react'
import {startResumeRefresh} from '../lib/resume-refresh'
import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {loadDashboardReport,type DashboardCategory,type DashboardReport} from '../lib/dashboard-api'
import {dashboardStockSummary} from '../lib/dashboard-summary'

import { InventoryActivity } from './InventoryActivity'
import { DashboardWarranty } from './DashboardWarranty'
import { StockReportExport } from './StockReportExport'
import { InventoryInsights } from './InventoryInsights'
import { ShelfCountDivergences } from './ShelfCount'
import { SharedShelfLayout } from './SharedShelfLayout'
import {presentationBundle} from '../lib/presentation-bundle'
import { StockPresentation } from './StockPresentation'
import './InventoryDashboard.css'
import {PageHeading} from './InventoryLayout'
import {Card,Button,Table,Progress,ActionGroup} from './Interface'

function MetricIcon({kind}:{kind:string}) {
 const cube='M4 7l8-4 8 4v10l-8 4-8-4z M4 7l8 4 8-4 M12 11v10'
 const paths:Record<string,string>={shock:cube,spring:'M7 5h10 M7 10h10 M7 15h10 M7 20h10',boxes:cube,barcode:'M4 5v14 M8 5v14 M12 5v14 M16 5v14 M20 5v14'}
 return <span className="metric-icon-box"><svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]}/></svg></span>
}

const dateFormat=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bahia'})

export function DashboardActivity({report,onHistory=()=>{}}:{report:DashboardReport;onHistory?:()=>void}){
  const maximum=Math.max(1,...report.sales_by_product.map((row)=>row.boxes))
  return <div className="dashboard-columns">
    <Card className="inventory-panel dashboard-panel dashboard-sales-panel" aria-labelledby="dashboard-sales-title"><div className="reference-section-heading"><h2 id="dashboard-sales-title">Vendas por código</h2><span>Últimos 30 dias</span></div>
      {!report.sales_by_product.length?<div className="dashboard-empty"><svg className="sales-empty-chart" viewBox="0 0 500 150" role="img" aria-label="Vendas por código: zero caixas vendidas no período"><path d="M30 20V120H480" fill="none" stroke="currentColor" opacity=".3"/><path d="M30 70H480M30 20H480" fill="none" stroke="currentColor" opacity=".12"/><text x="250" y="80" textAnchor="middle" fill="currentColor" fontSize="18">0 caixas vendidas</text></svg><p>Nenhuma venda registrada neste período e categoria.</p></div>:<Table className="dashboard-sales-table" aria-label="Vendas por código"><thead><tr><th>Produto</th><th>Caixas vendidas</th></tr></thead><tbody>{report.sales_by_product.map((row)=><tr key={row.code}><td>{row.code}</td><td><span className="dashboard-bar-track" aria-hidden="true"><span style={{width:`${row.boxes/maximum*100}%`}}/></span><strong>{row.boxes}</strong></td></tr>)}</tbody></Table>}
      <details className="dashboard-sales-notes"><summary>Detalhes das vendas</summary><p>{report.sold_boxes} {report.sold_boxes===1?'caixa vendida':'caixas vendidas'} em {report.sales_count} {report.sales_count===1?'registro de venda':'registros de venda'}.</p><p>Período: {dateFormat.format(new Date(report.period_start))} até {dateFormat.format(new Date(report.as_of))}. Até 10 códigos com mais caixas vendidas.</p><p>Transferências, descartes e devoluções não entram na contagem de vendas.</p></details>
    </Card>
    <Card className="inventory-panel dashboard-panel dashboard-receipts-panel" aria-labelledby="dashboard-receipts-title"><div className="reference-section-heading"><h2 id="dashboard-receipts-title">Entradas recentes</h2><Button variant="link" onClick={onHistory}>Ver todas</Button></div>
      {!report.receipts.length?<p className="dashboard-empty">Nenhum recebimento registrado nesta categoria.</p>:<ol className="dashboard-receipt-list" tabIndex={0} aria-label="Entradas recentes com rolagem">{report.receipts.map((row)=><li key={row.id}>
        <time dateTime={row.created_at}>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Bahia'}).format(new Date(row.created_at))}</time><strong>{row.code}</strong><b>+ {row.boxes}</b>
      </li>)}</ol>}
      <details className="dashboard-receipt-notes"><summary title="Detalhes das entradas">Detalhes das entradas</summary><p>Últimos 10 recebimentos da categoria selecionada, independentemente do período de vendas.</p>{report.receipts.map(row=><p key={row.id}>{row.code} · Fornecedor: {row.supplier??'Não informado'} · Lote: {row.lot??'Não informado'} · Local: {row.location??'—'}</p>)}</details>
    </Card>
  </div>
}

export function InventoryDashboard({catalog,stock,ready,onRefresh,onOpen,isAdministrator=false,activityReady=false,countUserId,capacityUserId,locations=[]}:{
  capacityUserId?:string;locations?:string[];countUserId?:string;activityReady?:boolean;isAdministrator?:boolean;catalog:Record<string,ProductInfo>;stock:StockRow[];ready:boolean;onRefresh:()=>Promise<void>;onOpen:(page:'inventory'|'springs'|'products'|'alerts'|'stock'|'warranty'|'outflow'|'history'|'catalog'|'turnover')=>void
}){
  const [category,setCategory]=useState<DashboardCategory>('all')
  const [view,setView]=useState<'stock'|'presentation'>('stock')
  const [revision,setRevision]=useState(0)
  const [refreshing,setRefreshing]=useState(false)
  const [refreshError,setRefreshError]=useState('')
  const [automaticError,setAutomaticError]=useState({key:'',message:''})
  const manualPending=useRef(false)
  const shortcuts=useRef<HTMLDetailsElement>(null)
  const [mapMessage,setMapMessage]=useState('')
  const reportKey=`${category}:${revision}`
  const [result,setResult]=useState<{category:DashboardCategory;revision:number;report:DashboardReport|null;error:string}>({category:'all',revision:-1,report:null,error:''})
  const loading=ready&&(result.category!==category||result.revision!==revision)
  const summary=dashboardStockSummary(catalog,stock,category)
  // O resumo principal sempre inclui as duas categorias, mesmo com o relatório filtrado.
  const shockBoxes=dashboardStockSummary(catalog,stock,'shocks').boxes
  const springBoxes=dashboardStockSummary(catalog,stock,'springs').boxes
  const stockPage=category==='all'?'stock':category==='springs'?'springs':'inventory'
  useEffect(()=>{
    if(!ready||view==='presentation')return
    let current=true
    let initialPending=true
    let hasReport=false
    function publish(report:DashboardReport){
      if(!current)return
      hasReport=true
      setResult({category,revision,report,error:''})
      setAutomaticError({key:reportKey,message:''})
    }
    void loadDashboardReport(category).then(publish)
      .catch((caught)=>{if(current)setResult({category,revision,report:null,error:caught instanceof Error?caught.message:'Não foi possível carregar o painel.'})})
      .finally(()=>{initialPending=false})
    const stop=startResumeRefresh({
      intervalMs:30_000,load:()=>loadDashboardReport(category),apply:publish,
      canRefresh:()=>!initialPending&&!manualPending.current&&!document.querySelector('dialog[open]'),
      onError:()=>{
        if(hasReport)setAutomaticError({key:reportKey,message:'Não foi possível atualizar vendas e entradas automaticamente. Os dados da consulta anterior permanecem na tela.'})
        else setResult({category,revision,report:null,error:'Não foi possível consultar vendas e entradas. Confira a conexão e tente atualizar.'})
      },
    })
    return()=>{current=false;stop()}
  },[ready,category,revision,reportKey,view])
  async function refresh(){
    if(refreshing||loading||manualPending.current)return
    manualPending.current=true
    setRefreshing(true);setRefreshError('')
    try{await onRefresh();setRevision((value)=>value+1)}
    catch{setRefreshError('Não foi possível atualizar o estoque. Os valores da consulta anterior permanecem na tela.')}
    finally{manualPending.current=false;setRefreshing(false)}
  }
  function openPage(page:Parameters<typeof onOpen>[0]){if(shortcuts.current)shortcuts.current.open=false;onOpen(page)}
  function showMore(id:string){
    if(shortcuts.current)shortcuts.current.open=false
    setView('stock')
    requestAnimationFrame(()=>{const more=document.getElementById('dashboard-more') as HTMLDetailsElement|null;const target=document.getElementById(id);if(!more||!target)return;more.open=true;if(target instanceof HTMLDetailsElement)target.open=true;target.focus();target.scrollIntoView({block:'start',behavior:'instant'})})
  }
  function openLocation(location:string){
    setMapMessage('')
    showMore('dashboard-map')
    requestAnimationFrame(()=>{
      const button=Array.from(document.querySelectorAll<HTMLButtonElement>('#dashboard-map .map-shelf')).find(item=>item.dataset.location===location)
      if(!button){setMapMessage('A planta operacional ainda não está disponível para esta região. Aguarde a consulta ou atualize a planta e tente novamente.');return}
      if(button.getAttribute('aria-pressed')!=='true')button.click()
      button.focus();button.scrollIntoView({block:'center',behavior:'instant'})
    })
  }
  return <div className="reference-dashboard">
    <PageHeading section="VISÃO GERAL" title="Painel inicial" subtitle="Acompanhe seu estoque, movimentações e principais indicadores." actions={<details ref={shortcuts} className="dashboard-quicknav" onKeyDown={event=>{if(event.key==='Escape'&&shortcuts.current){event.preventDefault();shortcuts.current.open=false;shortcuts.current.querySelector('summary')?.focus()}}}><summary>Atalhos <span aria-hidden="true">⌄</span></summary><div><ActionGroup label="Ir para um módulo">
      <Button onClick={()=>openPage('products')}>Produtos</Button><Button onClick={()=>openPage('warranty')}>Garantia</Button><Button onClick={()=>openPage('alerts')}>Alertas</Button>{isAdministrator&&<Button onClick={()=>openPage('outflow')}>Saídas</Button>}<Button onClick={()=>openPage('history')}>Histórico</Button><Button onClick={()=>openPage('catalog')}>Aplicações</Button><Button onClick={()=>openPage('turnover')}>Giro e ABC</Button>
    </ActionGroup><ActionGroup label="Informações do Painel"><Button onClick={()=>showMore('dashboard-map')}>Planta e capacidades</Button><Button onClick={()=>showMore('dashboard-exports')}>Exportar relatórios</Button><Button onClick={()=>showMore('dashboard-analysis')}>Análises e conferências</Button><Button onClick={()=>showMore('dashboard-filters')}>Filtros e atualização</Button></ActionGroup>
    {capacityUserId&&<label>Visualização do Painel<select value={view} onChange={event=>{setView(event.target.value as typeof view);if(shortcuts.current)shortcuts.current.open=false}}><option value="stock">Consulta do estoque</option><option value="presentation">Apresentação</option></select></label>}</div></details>}/>
    {view==='presentation'&&capacityUserId?<StockPresentation userId={`presentation:${capacityUserId}`} canEdit={isAdministrator} canPick={Boolean(countUserId)}/>:!ready?<section className="inventory-panel dashboard-panel"><p role="status">O painel de vendas e recebimentos aguarda ativação no banco. Os módulos de estoque continuam disponíveis.</p><button className="add-product-button" type="button" onClick={()=>onOpen('inventory')}>Consultar amortecedores</button><button className="theme-toggle" type="button" onClick={()=>onOpen('springs')}>Consultar molas</button></section>:<>
      <section className="dashboard-stock-totals" aria-label="Total de caixas por categoria">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('inventory')}><MetricIcon kind="shock"/><span>Amortecedores</span><strong>{shockBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Consultar estoque <span aria-hidden="true">→</span></span></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('springs')}><MetricIcon kind="spring"/><span>Molas</span><strong>{springBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Consultar estoque <span aria-hidden="true">→</span></span></button>
        <button type="button" className="dashboard-stat dashboard-stat-total" onClick={()=>onOpen('stock')}><MetricIcon kind="boxes"/><span>Total em estoque</span><strong>{shockBoxes+springBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Amortecedores + molas · sem garantia <span aria-hidden="true">→</span></span></button>
        <button type="button" className="dashboard-stat dashboard-stat-products" onClick={()=>onOpen('products')}><MetricIcon kind="barcode"/><span>Produtos cadastrados</span><strong>{Object.keys(catalog).length}</strong><span className="dashboard-stat-link">Abrir catálogo de produtos <span aria-hidden="true">→</span></span></button>
      </section>
      {refreshError&&<p className="dashboard-error auth-error" role="alert">{refreshError}</p>}
      {automaticError.key===reportKey&&automaticError.message&&<p className="dashboard-error auth-error" role="status">{automaticError.message}</p>}
      <div id="dashboard-detail" className="dashboard-detail is-expanded reference-summary-grid">
      {activityReady && <InventoryActivity category={category} revision={revision} pauseRef={manualPending}/>}
      {loading?<Card className="dashboard-message" role="status">Carregando vendas e recebimentos…</Card>:result.error?<Card className="dashboard-error auth-error" role="alert">{result.error}</Card>:result.report&&<DashboardActivity report={result.report} onHistory={()=>onOpen('history')}/>}
      <Card className="inventory-panel dashboard-panel dashboard-replenishment" aria-label="Reposição"><h2>Reposição</h2>{summary.alerts.length?summary.alerts.slice(0,2).map(row=><div className="replenishment-row" key={row.code}><div><strong>{row.code}</strong><span>{row.total} de {row.minimum??'—'} (mínimo)</span></div><div className="replenishment-meter"><Progress max={Math.max(1,row.minimum??1)} value={row.total} label={`Estoque de ${row.code} em relação ao mínimo`}/><strong>{row.minimum?Math.round(row.total/row.minimum*100)+'%':'—'}</strong></div></div>):<p>Nenhum produto necessita reposição.</p>}</Card>
      <Card className={`inventory-panel dashboard-panel dashboard-alert-panel${summary.alerts.length?' has-alerts':''}`} aria-labelledby="dashboard-alerts-title"><div className="dashboard-alert-heading"><h2 id="dashboard-alerts-title">Alertas de reposição</h2><Button variant="link" onClick={()=>onOpen('alerts')}>Ver todas</Button></div><div className="dashboard-alert-callout"><strong>{summary.alerts.length?`${summary.alerts.length} produtos no limite mínimo`:'Estoque dentro dos limites'}</strong><span>{summary.alerts.length?'Faça a reposição para evitar falta em estoque.':'Nenhuma reposição pendente nesta consulta.'}</span></div>
        {!summary.alerts.length?<p>Nenhum produto zerado ou no limite configurado nesta consulta.</p>:<ul className="dashboard-alert-list" tabIndex={0} aria-label="Alertas de reposição com rolagem">{summary.alerts.slice(0,6).map((row)=><li key={row.code}><strong>{row.code}</strong><span>{row.severity==='zero'?'Sem estoque':`${row.total} caixas · mínimo ${row.minimum}`}</span></li>)}</ul>}
        {summary.alerts.length>6&&<p>Prévia de 6 dos {summary.alerts.length} alertas. Consulte os estoques para ver todos.</p>}
      </Card>
      </div>
      <details id="dashboard-more" className="dashboard-more"><summary>Mais informações <span>Filtros, disponibilidade, Garantia, planta, relatórios e análises</span></summary><div className="dashboard-more-content">
      <details id="dashboard-filters" tabIndex={-1} className="dashboard-controls"><summary>Filtros do painel</summary><div className="dashboard-tools"><label>Filtrar indicadores<select value={category} disabled={refreshing} onChange={(event)=>setCategory(event.target.value as DashboardCategory)}><option value="all">Amortecedores e molas</option><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label><Button disabled={refreshing||loading} onClick={()=>void refresh()}>{refreshing?'Atualizando…':'Atualizar painel'}</Button></div></details>
      <section className="dashboard-totals" aria-label="Resumo do estoque normal">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen(stockPage)}><span>Caixas na seleção</span><strong>{summary.boxes}</strong><small>Consultar estoque ↗</small></button><button type="button" className="dashboard-stat" onClick={()=>onOpen('products')}><span>Produtos cadastrados</span><strong>{summary.products}</strong><small>Abrir catálogo de produtos ↗</small></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('alerts')}><span>Produtos sem estoque</span><strong>{summary.zeros}</strong><small>Consultar alertas ↗</small></button><button type="button" className="dashboard-stat" onClick={()=>onOpen('alerts')}><span>No mínimo ou abaixo</span><strong>{summary.low}</strong><small>Consultar alertas ↗</small></button>
      </section>
      <section className="dashboard-totals dashboard-availability" aria-label="Disponibilidade por situação">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen(stockPage)}><span>Disponível para venda</span><strong>{summary.available}<small> caixas</small></strong><small>Amortecedores liberados e molas em estoque</small></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('inventory')}><span>Aguardando testagem</span><strong>{summary.awaiting}<small> caixas</small></strong><small>Somente amortecedores · não disponíveis para venda</small></button>
      </section>
      <DashboardWarranty category={category} revision={revision} onOpen={()=>onOpen('warranty')}/>
      <div id="dashboard-exports" tabIndex={-1}><StockReportExport/></div>
      <div id="dashboard-map" tabIndex={-1}>{mapMessage&&<p role="status">{mapMessage}</p>}{capacityUserId && <SharedShelfLayout key={`inventory:${capacityUserId}`} userId={capacityUserId} canEdit={isAdministrator} operationalStock={stock} data={{...presentationBundle,locations}}/>}</div>
      <div id="dashboard-analysis" tabIndex={-1}>
      <InventoryInsights catalog={catalog} stock={stock} category={category} locations={locations} onOpenLocation={capacityUserId?openLocation:undefined}/>
      {countUserId && <ShelfCountDivergences userId={countUserId} category={category} stock={stock} onOpen={()=>onOpen('inventory')}/>}
      </div>
      {result.report&&<p className="dashboard-message">Movimentações consultadas em {dateFormat.format(new Date(result.report.as_of))}.</p>}
      </div></details>
    </>}
  </div>
}
