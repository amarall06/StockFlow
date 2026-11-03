import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {isSpringCode} from '../lib/product-category'
import {ProductApplications} from './ProductApplications'
import {StockAlerts} from './StockAlerts'
import {dashboardStockSummary} from '../lib/dashboard-summary'
import {searchableProductText} from '../lib/product-details'
import {ProductPhoto} from './ProductPhotos'
import {ExportCsvButton} from './ExportCsvButton'
import './InventoryDashboard.css'
import {PageHeading} from './InventoryLayout'
import './InventoryAlertsReference.css'

type Page='inventory'|'springs'|'catalog'

export {ProductsOverview} from './ProductsOverview'

// Consulta conjunta para o cartão do total: não mistura garantia com estoque normal.
export function AllStockOverview({catalog,stock,onOpen}:{catalog:Record<string,ProductInfo>;stock:StockRow[];onOpen:(page:Page)=>void}){
  const rows=stock.filter((row)=>row.boxes>0&&(isSpringCode(row.code)?row.status==='Em estoque':['Aguardando testagem','Liberado para venda'].includes(row.status))).sort((a,b)=>a.code.localeCompare(b.code)||a.location.localeCompare(b.location)||a.status.localeCompare(b.status))
  return <>
    <div className="page-heading"><div><p className="eyebrow">CONSULTA</p><h1>Estoque geral</h1><p className="subtitle">{rows.reduce((sum,row)=>sum+row.boxes,0)} caixas de amortecedores e molas. Garantia contabilizada separadamente.</p></div></div>
    <section className="inventory-panel dashboard-panel"><div className="dashboard-tools"><button className="theme-toggle" type="button" onClick={()=>onOpen('inventory')}>Estoque de amortecedores</button><button className="theme-toggle" type="button" onClick={()=>onOpen('springs')}>Estoque de molas</button><ExportCsvButton name="liber-estoque" headers={['Código','Categoria','Aplicação','Local padrão','Local atual','Situação','Caixas']} rows={rows.map(row=>[row.code,isSpringCode(row.code)?'Mola':'Amortecedor',searchableProductText(catalog[row.code]),catalog[row.code]?.defaultLocation,row.location,row.status,row.boxes])}/></div>
      <div className="combined-stock-scroll"><table className="combined-stock-table"><thead><tr><th>Código</th><th>Categoria</th><th>Local</th><th>Situação</th><th>Caixas</th></tr></thead><tbody>{rows.map((row)=><tr key={`${row.code}-${row.location}-${row.status}`}><td><div className="combined-stock-product"><ProductPhoto code={row.code}/><div><strong>{row.code}</strong><ProductApplications product={catalog[row.code]}/></div></div></td><td>{isSpringCode(row.code)?'Mola':'Amortecedor'}</td><td>{row.location}</td><td>{row.status}</td><td><strong>{row.boxes}</strong></td></tr>)}</tbody></table></div>
      {!rows.length&&<p>Nenhuma caixa no estoque normal.</p>}
    </section>
  </>
}

// As duas categorias ficam lado a lado na mesma central, usando as regras já existentes.
export function InventoryAlerts({catalog,stock,ready,isAdministrator,onRefresh,onOpen,canReceive}:{catalog:Record<string,ProductInfo>;stock:StockRow[];ready:boolean;isAdministrator:boolean;onRefresh:()=>Promise<void>;onOpen:(page:Page)=>void;canReceive:boolean}){
  const summary=dashboardStockSummary(catalog,stock,'all')
  return <div className="reference-alerts">
    <PageHeading section="ATENÇÃO" title="Alertas" subtitle="Produtos que chegaram ao estoque mínimo, ficaram abaixo dele ou estão sem estoque."/>
    <div className="reference-alert-banner" role="status"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><div><strong>{ready?`${summary.zeros+summary.low} ${(summary.zeros+summary.low)===1?'produto precisa':'produtos precisam'} de reposição`:'Consultando alertas de reposição…'}</strong><p>Faça a reposição para evitar falta em estoque.</p></div></div>
    <StockAlerts reference onOpenStock={()=>onOpen('inventory')} canReceive={canReceive} titleId="shock-alerts-title" catalog={catalog} stock={stock} springs={false} ready={ready} isAdministrator={isAdministrator} onRefresh={onRefresh}/>
    <StockAlerts reference onOpenStock={()=>onOpen('springs')} canReceive={canReceive} titleId="spring-alerts-title" catalog={catalog} stock={stock} springs ready={ready} isAdministrator={isAdministrator} onRefresh={onRefresh}/>
  </div>
}
