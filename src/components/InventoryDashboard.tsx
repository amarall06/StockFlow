import {useEffect,useState} from 'react'
import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {loadDashboardReport,type DashboardCategory,type DashboardReport} from '../lib/dashboard-api'
import {dashboardStockSummary} from '../lib/dashboard-summary'
import { InventoryActivity } from './InventoryActivity'
import './InventoryDashboard.css'

const dateFormat=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bahia'})

export function DashboardActivity({report}:{report:DashboardReport}){
  const maximum=Math.max(1,...report.sales_by_product.map((row)=>row.boxes))
  return <div className="dashboard-columns">
    <section className="inventory-panel dashboard-panel" aria-labelledby="dashboard-sales-title"><h2 id="dashboard-sales-title">Vendas por código · últimos 30 dias</h2>
      <p>{report.sold_boxes} {report.sold_boxes===1?'caixa vendida':'caixas vendidas'} em {report.sales_count} {report.sales_count===1?'registro de venda':'registros de venda'}.</p>
      <p>Período: {dateFormat.format(new Date(report.period_start))} até {dateFormat.format(new Date(report.as_of))}. Até 10 códigos com mais caixas vendidas.</p>
      {!report.sales_by_product.length?<p className="dashboard-empty">Nenhuma venda registrada neste período e categoria.</p>:<table className="dashboard-sales-table"><thead><tr><th>Produto</th><th>Caixas vendidas</th></tr></thead><tbody>{report.sales_by_product.map((row)=><tr key={row.code}><td>{row.code}</td><td><span className="dashboard-bar-track" aria-hidden="true"><span style={{width:`${row.boxes/maximum*100}%`}}/></span><strong>{row.boxes}</strong></td></tr>)}</tbody></table>}
      <p className="dashboard-footnote">Transferências, descartes e devoluções não entram na contagem de vendas.</p>
    </section>
    <section className="inventory-panel dashboard-panel" aria-labelledby="dashboard-receipts-title"><h2 id="dashboard-receipts-title">Entradas recentes</h2><p>Últimos 10 recebimentos da categoria selecionada, independentemente do período de vendas.</p>
      {!report.receipts.length?<p className="dashboard-empty">Nenhum recebimento registrado nesta categoria.</p>:<ol className="dashboard-receipt-list">{report.receipts.map((row)=><li key={row.id}>
        <div><strong>{row.code}</strong><span>{row.boxes} {row.boxes===1?'caixa':'caixas'} · {row.location??'Local não informado'}</span></div><time dateTime={row.created_at}>{dateFormat.format(new Date(row.created_at))}</time>
        <p>Fornecedor: {row.supplier??'Não informado'} · Lote: {row.lot??'Não informado'}</p>
      </li>)}</ol>}
    </section>
  </div>
}

export function InventoryDashboard({catalog,stock,ready,onRefresh,onOpen,isAdministrator=false,activityReady=false}:{
  activityReady?:boolean;isAdministrator?:boolean;catalog:Record<string,ProductInfo>;stock:StockRow[];ready:boolean;onRefresh:()=>Promise<void>;onOpen:(page:'inventory'|'springs'|'products'|'alerts'|'stock'|'warranty'|'outflow'|'history')=>void
}){
  const [expanded,setExpanded]=useState(false)
  const [category,setCategory]=useState<DashboardCategory>('all')
  const [revision,setRevision]=useState(0)
  const [refreshing,setRefreshing]=useState(false)
  const [refreshError,setRefreshError]=useState('')
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
    void loadDashboardReport(category).then((report)=>{if(current)setResult({category,revision,report,error:''})})
      .catch((caught)=>{if(current)setResult({category,revision,report:null,error:caught instanceof Error?caught.message:'Não foi possível carregar o painel.'})})
    return()=>{current=false}
  },[ready,category,revision])
  async function refresh(){
    if(refreshing||loading)return
    setRefreshing(true);setRefreshError('')
    try{await onRefresh();setRevision((value)=>value+1)}
    catch{setRefreshError('Não foi possível atualizar o estoque. Os valores da consulta anterior permanecem na tela.')}
    finally{setRefreshing(false)}
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">LIBER AUTOMOTIVE</p><h1>Painel inicial</h1><p className="subtitle">Resumo de estoque, reposição, vendas e recebimentos.</p></div></div>
    {!ready?<section className="inventory-panel dashboard-panel"><p role="status">O painel de vendas e recebimentos aguarda ativação no banco. Os módulos de estoque continuam disponíveis.</p><button className="add-product-button" type="button" onClick={()=>onOpen('inventory')}>Consultar amortecedores</button><button className="theme-toggle" type="button" onClick={()=>onOpen('springs')}>Consultar molas</button></section>:<>
      <section className="dashboard-stock-totals" aria-label="Total de caixas por categoria">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('inventory')}><span>Amortecedores</span><strong>{shockBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Consultar estoque <span aria-hidden="true">↗</span></span></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('springs')}><span>Molas</span><strong>{springBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Consultar estoque <span aria-hidden="true">↗</span></span></button>
        <button type="button" className="dashboard-stat dashboard-stat-total" onClick={()=>onOpen('stock')}><span>Total no estoque normal</span><strong>{shockBoxes+springBoxes}<small> caixas</small></strong><span className="dashboard-stat-link">Amortecedores + molas · sem garantia <span aria-hidden="true">↗</span></span></button>
      </section>
      <section className="dashboard-shortcuts" aria-label="Atalhos de trabalho">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('alerts')}><span>Alertas</span><strong>{summary.alerts.length}</strong><small>Conferir reposição →</small></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('warranty')}><span>Garantia</span><strong>Consultar →</strong><small>Fabricantes e devoluções</small></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen(isAdministrator?'outflow':'history')}><span>{isAdministrator?'Saídas':'Histórico'}</span><strong>Abrir →</strong><small>{isAdministrator?'Registrar retirada':'Ver movimentações'}</small></button>
      </section>
      <button type="button" className="dashboard-expand theme-toggle" aria-expanded={expanded} aria-controls="dashboard-detail" onClick={()=>setExpanded(value=>!value)}>{expanded?'Resumir painel':'Ver indicadores e atividade'}</button>
      <div id="dashboard-detail" className={`dashboard-detail${expanded?' is-expanded':''}`}>
      <div className="dashboard-tools"><label>Filtrar indicadores<select value={category} disabled={refreshing} onChange={(event)=>setCategory(event.target.value as DashboardCategory)}><option value="all">Amortecedores e molas</option><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label><button className="theme-toggle" type="button" disabled={refreshing||loading} onClick={()=>void refresh()}>{refreshing?'Atualizando…':'Atualizar painel'}</button></div>
      {refreshError&&<p className="dashboard-error auth-error" role="alert">{refreshError}</p>}
      <section className="dashboard-totals" aria-label="Resumo do estoque normal">
        <button type="button" className="dashboard-stat" onClick={()=>onOpen(stockPage)}><span>Caixas na seleção</span><strong>{summary.boxes}</strong><small>Consultar estoque ↗</small></button><button type="button" className="dashboard-stat" onClick={()=>onOpen('products')}><span>Produtos cadastrados</span><strong>{summary.products}</strong><small>Abrir catálogo de produtos ↗</small></button>
        <button type="button" className="dashboard-stat" onClick={()=>onOpen('alerts')}><span>Produtos sem estoque</span><strong>{summary.zeros}</strong><small>Consultar alertas ↗</small></button><button type="button" className="dashboard-stat" onClick={()=>onOpen('alerts')}><span>No mínimo ou abaixo</span><strong>{summary.low}</strong><small>Consultar alertas ↗</small></button>
      </section>
      <section className={`inventory-panel dashboard-panel dashboard-alert-panel${summary.alerts.length?' has-alerts':''}`} aria-labelledby="dashboard-alerts-title"><div className="dashboard-alert-heading"><div><span className="dashboard-section-label">Reposição</span><h2 id="dashboard-alerts-title">{summary.alerts.length?`${summary.alerts.length} produtos precisam de atenção`:'Estoque dentro dos limites'}</h2></div><button type="button" className="theme-toggle" onClick={()=>onOpen('alerts')}>Ver todos os alertas <span aria-hidden="true">↗</span></button></div><p>Estoque normal de todas as localizações. Amortecedores aguardando teste entram no total.</p>
        {!summary.alerts.length?<p>Nenhum produto zerado ou no limite configurado nesta consulta.</p>:<ul className="dashboard-alert-list">{summary.alerts.slice(0,6).map((row)=><li key={row.code}><strong>{row.code}</strong><span>{row.severity==='zero'?'Sem estoque':`${row.total} caixas · mínimo ${row.minimum}`}</span></li>)}</ul>}
        {summary.alerts.length>6&&<p>Prévia de 6 dos {summary.alerts.length} alertas. Consulte os estoques para ver todos.</p>}
      </section>
      {activityReady && <InventoryActivity category={category} revision={revision}/>}
      {loading?<p className="dashboard-message" role="status">Carregando vendas e recebimentos…</p>:result.error?<p className="dashboard-error auth-error" role="alert">{result.error}</p>:result.report&&<><p className="dashboard-message">Movimentações consultadas em {dateFormat.format(new Date(result.report.as_of))}.</p><DashboardActivity report={result.report}/></>}
      </div>
    </>}
  </>
}
