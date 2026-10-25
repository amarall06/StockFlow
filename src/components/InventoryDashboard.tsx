import {useEffect,useState} from 'react'
import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {loadDashboardReport,type DashboardCategory,type DashboardReport} from '../lib/dashboard-api'
import {dashboardStockSummary} from '../lib/dashboard-summary'
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

export function InventoryDashboard({catalog,stock,ready,onRefresh,onOpen}:{
  catalog:Record<string,ProductInfo>;stock:StockRow[];ready:boolean;onRefresh:()=>Promise<void>;onOpen:(page:'inventory'|'springs')=>void
}){
  const [category,setCategory]=useState<DashboardCategory>('all')
  const [revision,setRevision]=useState(0)
  const [refreshing,setRefreshing]=useState(false)
  const [refreshError,setRefreshError]=useState('')
  const [result,setResult]=useState<{category:DashboardCategory;revision:number;report:DashboardReport|null;error:string}>({category:'all',revision:-1,report:null,error:''})
  const loading=ready&&(result.category!==category||result.revision!==revision)
  const summary=dashboardStockSummary(catalog,stock,category)
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
      <div className="dashboard-tools"><label>Categoria do painel<select value={category} disabled={refreshing} onChange={(event)=>setCategory(event.target.value as DashboardCategory)}><option value="all">Amortecedores e molas</option><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label><button className="theme-toggle" type="button" disabled={refreshing||loading} onClick={()=>void refresh()}>{refreshing?'Atualizando…':'Atualizar painel'}</button><button className="theme-toggle" type="button" onClick={()=>onOpen('inventory')}>Consultar amortecedores</button><button className="theme-toggle" type="button" onClick={()=>onOpen('springs')}>Consultar molas</button></div>
      {refreshError&&<p className="dashboard-error auth-error" role="alert">{refreshError}</p>}
      <section className="dashboard-totals" aria-label="Resumo do estoque normal">
        <article><span>Caixas no estoque normal</span><strong>{summary.boxes}</strong><small>Garantia não incluída</small></article><article><span>Produtos cadastrados</span><strong>{summary.products}</strong><small>Na categoria selecionada</small></article>
        <article><span>Produtos sem estoque</span><strong>{summary.zeros}</strong><small>Considera o catálogo completo</small></article><article><span>No mínimo ou abaixo</span><strong>{summary.low}</strong><small>Produtos com saldo positivo</small></article>
      </section>
      <section className="inventory-panel dashboard-panel" aria-labelledby="dashboard-alerts-title"><h2 id="dashboard-alerts-title">Atenção à reposição</h2><p>Nos amortecedores, o total inclui aguardando teste e liberados. Configure os mínimos na página de estoque da categoria.</p>
        {!summary.alerts.length?<p>Nenhum produto zerado ou no limite configurado nesta consulta.</p>:<ul className="dashboard-alert-list">{summary.alerts.slice(0,6).map((row)=><li key={row.code}><strong>{row.code}</strong><span>{row.severity==='zero'?'Sem estoque':`${row.total} caixas · mínimo ${row.minimum}`}</span></li>)}</ul>}
        {summary.alerts.length>6&&<p>Prévia de 6 dos {summary.alerts.length} alertas. Consulte os estoques para ver todos.</p>}
      </section>
      {loading?<p className="dashboard-message" role="status">Carregando vendas e recebimentos…</p>:result.error?<p className="dashboard-error auth-error" role="alert">{result.error}</p>:result.report&&<><p className="dashboard-message">Movimentações consultadas em {dateFormat.format(new Date(result.report.as_of))}.</p><DashboardActivity report={result.report}/></>}
    </>}
  </>
}
