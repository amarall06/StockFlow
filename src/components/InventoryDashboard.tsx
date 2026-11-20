import {useEffect,useRef,useState} from 'react'
import {startResumeRefresh} from '../lib/resume-refresh'
import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {loadDashboardReport,type DashboardCategory,type DashboardReport} from '../lib/dashboard-api'
import {dashboardStockSummary} from '../lib/dashboard-summary'

import { InventoryActivity } from './InventoryActivity'
import { StockReportExport } from './StockReportExport'
import { InventoryInsights } from './InventoryInsights'
import { ShelfCountDivergences } from './ShelfCount'
import { WarehousePreview } from './WarehousePreview'
import type {WarehouseActionHandler} from '../lib/warehouse-navigation'

import './InventoryDashboard.css'
import './DashboardHome.css'
import {PageHeading} from './InventoryLayout'
import {Card,Button,Table,ActionGroup} from './Interface'

function MetricIcon({kind}:{kind:string}) {
 const cube='M4 7l8-4 8 4v10l-8 4-8-4z M4 7l8 4 8-4 M12 11v10'
 const paths:Record<string,string>={shock:cube,spring:'M7 5h10 M7 10h10 M7 15h10 M7 20h10',boxes:cube,barcode:'M4 5v14 M8 5v14 M12 5v14 M16 5v14 M20 5v14'}
 return <span className="metric-icon-box"><svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]}/></svg></span>
}

const dateFormat=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bahia'})

export function DashboardActivity({report,onHistory=()=>{},showSales=true,showReceipts=true}:{report:DashboardReport;onHistory?:()=>void;showSales?:boolean;showReceipts?:boolean}){
  const maximum=Math.max(1,...report.sales_by_product.map((row)=>row.boxes))
  return <div className="dashboard-columns">
    {showSales&&<Card className="inventory-panel dashboard-panel dashboard-sales-panel" aria-labelledby="dashboard-sales-title"><div className="reference-section-heading"><h2 id="dashboard-sales-title">Vendas por código</h2><span>Últimos 30 dias</span></div>
      {!report.sales_by_product.length?<div className="dashboard-empty"><svg className="sales-empty-chart" viewBox="0 0 500 150" role="img" aria-label="Vendas por código: zero caixas vendidas no período"><path d="M30 20V120H480" fill="none" stroke="currentColor" opacity=".3"/><path d="M30 70H480M30 20H480" fill="none" stroke="currentColor" opacity=".12"/><text x="250" y="80" textAnchor="middle" fill="currentColor" fontSize="18">0 caixas vendidas</text></svg><p>Nenhuma venda registrada neste período e categoria.</p></div>:<Table className="dashboard-sales-table" aria-label="Vendas por código"><thead><tr><th>Produto</th><th>Caixas vendidas</th></tr></thead><tbody>{report.sales_by_product.map((row)=><tr key={row.code}><td>{row.code}</td><td><span className="dashboard-bar-track" aria-hidden="true"><span style={{width:`${row.boxes/maximum*100}%`}}/></span><strong>{row.boxes}</strong></td></tr>)}</tbody></Table>}
      <details className="dashboard-sales-notes"><summary>Detalhes das vendas</summary><p>{report.sold_boxes} {report.sold_boxes===1?'caixa vendida':'caixas vendidas'} em {report.sales_count} {report.sales_count===1?'registro de venda':'registros de venda'}.</p><p>Período: {dateFormat.format(new Date(report.period_start))} até {dateFormat.format(new Date(report.as_of))}. Até 10 códigos com mais caixas vendidas.</p><p>Transferências e devoluções não entram na contagem de vendas.</p></details>
    </Card>}
    {showReceipts&&<Card className="inventory-panel dashboard-panel dashboard-receipts-panel" aria-labelledby="dashboard-receipts-title"><div className="reference-section-heading"><h2 id="dashboard-receipts-title">Entradas recentes</h2><Button variant="link" onClick={onHistory}>Ver todas</Button></div>
      {!report.receipts.length?<p className="dashboard-empty">Nenhum recebimento registrado nesta categoria.</p>:<ol className="dashboard-receipt-list" tabIndex={0} aria-label="Entradas recentes com rolagem">{report.receipts.map((row)=><li key={row.id}>
        <time dateTime={row.created_at}>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'America/Bahia'}).format(new Date(row.created_at))}</time><strong>{row.code}</strong><b>+ {row.boxes}</b>
      </li>)}</ol>}
      <details className="dashboard-receipt-notes"><summary title="Detalhes das entradas">Detalhes das entradas</summary><p>Últimos 10 recebimentos da categoria selecionada, independentemente do período de vendas.</p>{report.receipts.map(row=><p key={row.id}>{row.code} · Fornecedor: {row.supplier??'Não informado'} · Lote: {row.lot??'Não informado'} · Local: {row.location??'—'}</p>)}</details>
    </Card>}
  </div>
}

export function InventoryDashboard({catalog,stock,ready,onRefresh,onOpen,isAdministrator=false,activityReady=false,countUserId,capacityUserId,locations=[],onMapAction}:{
  onMapAction?:WarehouseActionHandler;capacityUserId?:string;locations?:string[];countUserId?:string;activityReady?:boolean;isAdministrator?:boolean;catalog:Record<string,ProductInfo>;stock:StockRow[];ready:boolean;onRefresh:()=>Promise<void>;onOpen:(page:'inventory'|'springs'|'products'|'alerts'|'stock'|'warranty'|'outflow'|'history'|'catalog'|'turnover')=>void
}){
  const [category,setCategory]=useState<DashboardCategory>('all')
  const [revision,setRevision]=useState(0)
  const [refreshing,setRefreshing]=useState(false)
  const [refreshError,setRefreshError]=useState('')
  const [automaticError,setAutomaticError]=useState({key:'',message:''})
  const manualPending=useRef(false)
  const shortcuts=useRef<HTMLDetailsElement>(null)
  const [mapMessage,setMapMessage]=useState('')
  const [activeTool,setActiveTool]=useState('')
  const toolTrigger=useRef<HTMLElement|null>(null)
  const reportKey=`${category}:${revision}`
  const [result,setResult]=useState<{category:DashboardCategory;revision:number;report:DashboardReport|null;error:string}>({category:'all',revision:-1,report:null,error:''})
  const loading=ready&&(result.category!==category||result.revision!==revision)
  const summary=dashboardStockSummary(catalog,stock,category)
  // O resumo principal sempre inclui as duas categorias, mesmo com o relatório filtrado.
  const shockBoxes=dashboardStockSummary(catalog,stock,'shocks').boxes
  const springBoxes=dashboardStockSummary(catalog,stock,'springs').boxes
  const stockPage=category==='all'?'stock':category==='springs'?'springs':'inventory'
  useEffect(()=>{
    if(!ready)return
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
  },[ready,category,revision,reportKey])
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
    toolTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null
    if(shortcuts.current)shortcuts.current.open=false
    if(id!=='dashboard-map')setActiveTool(id)
    requestAnimationFrame(()=>{const target=document.getElementById(id);target?.focus();target?.scrollIntoView({block:'start',behavior:'instant'})})
  }
  function closeTool(){setActiveTool('');const trigger=toolTrigger.current;const menu=trigger?.closest('details');if(menu&&!menu.open)menu.querySelector('summary')?.focus();else trigger?.focus()}
  function openLocation(location:string){
    setMapMessage('')
    showMore('dashboard-map')
    setMapMessage('O endereço '+location+' ainda aguarda confirmação na nova planta.')
  }
  return <div className="reference-dashboard dashboard-home">
    <PageHeading section="VISÃO GERAL" title="Painel inicial" subtitle="Estoque, movimentação e localização." actions={<div className="home-heading-actions">
      <Button className={summary.alerts.length?'home-alert-shortcut has-alerts':'home-alert-shortcut'} icon="alerts" onClick={()=>openPage('alerts')}>Alertas <span className="home-alert-count">{summary.alerts.length}</span></Button>
      <details ref={shortcuts} className="dashboard-quicknav" onKeyDown={event=>{if(event.key==='Escape'&&shortcuts.current){event.preventDefault();shortcuts.current.open=false;shortcuts.current.querySelector('summary')?.focus()}}}><summary>Atalhos <span aria-hidden="true">⌄</span></summary><div><ActionGroup label="Ir para um módulo">
        <Button icon="products" onClick={()=>openPage('products')}>Produtos</Button><Button icon="warranty" onClick={()=>openPage('warranty')}>Garantia</Button>{isAdministrator&&<Button icon="outflow" onClick={()=>openPage('outflow')}>Saídas</Button>}<Button icon="history" onClick={()=>openPage('history')}>Histórico</Button><Button icon="catalog" onClick={()=>openPage('catalog')}>Aplicações</Button><Button icon="turnover" onClick={()=>openPage('turnover')}>Giro e ABC</Button>
      </ActionGroup><ActionGroup label="Ferramentas do Painel"><Button icon="download" onClick={()=>showMore('dashboard-exports')}>Relatórios</Button><Button icon="inventory" onClick={()=>showMore('dashboard-analysis')}>Análises e conferências</Button><Button icon="history" onClick={()=>showMore('dashboard-receipts')}>Entradas recentes</Button><Button icon="filter" onClick={()=>showMore('dashboard-filters')}>Filtros e atualização</Button></ActionGroup></div></details>
    </div>}/>
      <section className="dashboard-stock-totals" aria-label="Total de caixas por categoria">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('inventory')}><MetricIcon kind="shock"/><span>Amortecedores</span><strong>{shockBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Consultar estoque <span aria-hidden="true">→</span></span></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('springs')}><MetricIcon kind="spring"/><span>Molas</span><strong>{springBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Consultar estoque <span aria-hidden="true">→</span></span></button>
        <button type="button" className="dashboard-stat dashboard-stat-total" onClick={()=>onOpen('stock')}><MetricIcon kind="boxes"/><span>Total em estoque</span><strong>{shockBoxes+springBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Amortecedores + molas · sem garantia <span aria-hidden="true">→</span></span></button>
      </section>

    {refreshError&&<p className="dashboard-error auth-error" role="alert">{refreshError}</p>}
    {automaticError.key===reportKey&&automaticError.message&&<p className="dashboard-error auth-error" role="status">{automaticError.message}</p>}
    <div className="home-main-grid">
      <div id="dashboard-map" className="home-map" tabIndex={-1}>{mapMessage&&<p role="status">{mapMessage}</p>}{capacityUserId?<WarehousePreview stock={stock} canOutflow={isAdministrator} onAction={onMapAction} topSellers={result.category===category?result.report?.sales_by_product:undefined}/>:<Card><h2>Mapa 3D</h2><a href="/warehouse-preview.html">Abrir prévia do galpão</a></Card>}</div>
      <div className="home-charts" aria-label="Gráficos do estoque">
        {activityReady&&<InventoryActivity category={category} revision={revision} pauseRef={manualPending}/>}
        {!ready?<Card><p role="status">Gráficos aguardando ativação. Consulte os produtos pelo menu.</p></Card>:loading?<Card className="dashboard-message dashboard-loading" role="status"><p>Carregando gráficos…</p><div className="dashboard-loading-bars" aria-hidden="true"><span/><span/><span/></div></Card>:result.error?<Card className="dashboard-error auth-error" role="alert">{result.error}</Card>:result.report&&<DashboardActivity report={result.report} showReceipts={false}/>}
      </div>
    </div>
    {activeTool&&<section id={activeTool} tabIndex={-1} className="home-tool-panel" aria-label="Ferramenta do Painel"><header><h2>{{'dashboard-exports':'Relatórios','dashboard-analysis':'Análises e conferências','dashboard-receipts':'Entradas recentes','dashboard-filters':'Filtros e atualização'}[activeTool]}</h2><Button onClick={closeTool}>Fechar</Button></header>
      {activeTool==='dashboard-filters'&&<>      <section className="dashboard-controls" aria-label="Filtros do painel"><div className="dashboard-tools"><label>Filtrar indicadores<select aria-label="Filtrar indicadores" value={category} disabled={refreshing} onChange={(event)=>setCategory(event.target.value as DashboardCategory)}><option value="all">Amortecedores e molas</option><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label><Button disabled={refreshing||loading} onClick={()=>void refresh()}>{refreshing?'Atualizando…':'Atualizar painel'}</Button></div></section>
<p className="home-availability">{summary.available} caixas disponíveis · {summary.awaiting} amortecedores aguardando teste</p><Button onClick={()=>onOpen(stockPage)}>Consultar estoque da seleção</Button></>}
      {activeTool==='dashboard-exports'&&<StockReportExport/>}
      {activeTool==='dashboard-receipts'&&(result.report?<DashboardActivity report={result.report} showSales={false} onHistory={()=>onOpen('history')}/>:<p role="status">{result.error||'Carregando entradas…'}</p>)}
      {activeTool==='dashboard-analysis'&&<><InventoryInsights catalog={catalog} stock={stock} category={category} locations={locations} onOpenLocation={capacityUserId?openLocation:undefined}/>{countUserId&&<ShelfCountDivergences userId={countUserId} category={category} stock={stock} onOpen={()=>onOpen('inventory')}/>}</>}
    </section>}
  </div>
}
