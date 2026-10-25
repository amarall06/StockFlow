import {useState} from 'react'
import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {isSpringCode} from '../lib/product-category'
import {ProductApplications} from './ProductApplications'
import {StockAlerts} from './StockAlerts'
import {dashboardStockSummary} from '../lib/dashboard-summary'
import {searchableProductText} from '../lib/product-details'

type Page='inventory'|'springs'|'catalog'

// Consulta conjunta para o cartão do total: não mistura garantia com estoque normal.
export function AllStockOverview({catalog,stock,onOpen}:{catalog:Record<string,ProductInfo>;stock:StockRow[];onOpen:(page:Page)=>void}){
  const rows=stock.filter((row)=>row.boxes>0&&(isSpringCode(row.code)?row.status==='Em estoque':['Aguardando testagem','Liberado para venda'].includes(row.status))).sort((a,b)=>a.code.localeCompare(b.code)||a.location.localeCompare(b.location)||a.status.localeCompare(b.status))
  return <>
    <div className="page-heading"><div><p className="eyebrow">CONSULTA</p><h1>Estoque geral</h1><p className="subtitle">{rows.reduce((sum,row)=>sum+row.boxes,0)} caixas de amortecedores e molas. Garantia contabilizada separadamente.</p></div></div>
    <section className="inventory-panel dashboard-panel"><div className="dashboard-tools"><button className="theme-toggle" type="button" onClick={()=>onOpen('inventory')}>Estoque de amortecedores</button><button className="theme-toggle" type="button" onClick={()=>onOpen('springs')}>Estoque de molas</button></div>
      <div className="combined-stock-scroll"><table className="combined-stock-table"><thead><tr><th>Código</th><th>Categoria</th><th>Local</th><th>Situação</th><th>Caixas</th></tr></thead><tbody>{rows.map((row)=><tr key={`${row.code}-${row.location}-${row.status}`}><td><strong>{row.code}</strong><ProductApplications product={catalog[row.code]}/></td><td>{isSpringCode(row.code)?'Mola':'Amortecedor'}</td><td>{row.location}</td><td>{row.status}</td><td><strong>{row.boxes}</strong></td></tr>)}</tbody></table></div>
      {!rows.length&&<p>Nenhuma caixa no estoque normal.</p>}
    </section>
  </>
}

// O catálogo reúne os dois tipos; a edição das aplicações continua exclusiva dos amortecedores.
export function ProductsOverview({catalog,onOpen,isAdministrator}:{catalog:Record<string,ProductInfo>;onOpen:(page:Page)=>void;isAdministrator:boolean}){
  const [search,setSearch]=useState('')
  const products=Object.entries(catalog).filter(([code,product])=>`${code} ${searchableProductText(product)}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))).sort(([a],[b])=>a.localeCompare(b))
  return <>
    <div className="page-heading"><div><p className="eyebrow">CATÁLOGO</p><h1>Produtos cadastrados</h1><p className="subtitle">Códigos, aplicações e localização padrão.</p></div></div>
    <section className="inventory-panel dashboard-panel">
      <div className="dashboard-tools"><label>Buscar produto<input className="product-search" type="search" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Código ou aplicação"/></label><button className="theme-toggle" type="button" onClick={()=>onOpen('catalog')}>{isAdministrator?'Editar':'Consultar'} aplicações de amortecedores</button></div>
      <p>{products.length} produtos encontrados</p>
      <ul className="product-directory">{products.map(([code,product])=><li key={code}>
        <div className="product-directory-code"><strong>{code}</strong><small>{isSpringCode(code)?'Mola':'Amortecedor'}</small></div>
        <ProductApplications product={product}/><span className="product-directory-location">Local padrão <strong>{product.defaultLocation||'Não definido'}</strong></span>
        <button className="theme-toggle" type="button" onClick={()=>onOpen(isSpringCode(code)?'springs':'inventory')}>Ver estoque <span aria-hidden="true">↗</span></button>
      </li>)}</ul>
      {!products.length&&<p>Nenhum produto encontrado para esta busca.</p>}
    </section>
  </>
}

// As duas categorias ficam lado a lado na mesma central, usando as regras já existentes.
export function InventoryAlerts({catalog,stock,ready,isAdministrator,onRefresh}:{catalog:Record<string,ProductInfo>;stock:StockRow[];ready:boolean;isAdministrator:boolean;onRefresh:()=>Promise<void>}){
  const summary=dashboardStockSummary(catalog,stock,'all')
  return <>
    <div className="page-heading"><div><p className="eyebrow">REPOSIÇÃO</p><h1>Alertas de estoque</h1><p className="subtitle">{ready?`${summary.zeros} produtos sem estoque · ${summary.low} no mínimo ou abaixo`:'Carregando disponibilidade dos alertas.'}</p></div></div>
    <div className="alerts-category-heading"><h2>Amortecedores</h2><span>Estoque normal</span></div>
    <StockAlerts titleId="shock-alerts-title" catalog={catalog} stock={stock} springs={false} ready={ready} isAdministrator={isAdministrator} onRefresh={onRefresh}/>
    <div className="alerts-category-heading"><h2>Molas</h2><span>Estoque normal</span></div>
    <StockAlerts titleId="spring-alerts-title" catalog={catalog} stock={stock} springs ready={ready} isAdministrator={isAdministrator} onRefresh={onRefresh}/>
  </>
}
