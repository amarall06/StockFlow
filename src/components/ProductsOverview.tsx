import {Fragment, useId, useState} from 'react'
import type {ProductInfo, StockRow} from '../lib/inventory-api'
import {isSpringCode} from '../lib/product-category'
import {searchableProductText} from '../lib/product-details'
import {calculateStockAlerts} from '../lib/stock-alerts'
import {PageHeading} from './InventoryLayout'
import {Badge, Button, Card, Table} from './Interface'
import {ProductApplications} from './ProductApplications'
import {ProductPhoto} from './ProductPhotos'
import './ProductsOverview.css'

type Page = 'inventory' | 'springs' | 'catalog'
type Category = 'all' | 'shocks' | 'springs'

// Apenas apresentação: saldo e classificação continuam usando a regra compartilhada.
export function ProductsOverview({catalog, stock, onOpen, isAdministrator}: {
  catalog: Record<string, ProductInfo>; stock: StockRow[]; onOpen: (page: Page) => void; isAdministrator: boolean
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const prefix = useId()
  const entries = Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b))
  const springs = entries.filter(([code]) => isSpringCode(code)).length
  const summaries = new Map([...calculateStockAlerts(catalog, stock, false), ...calculateStockAlerts(catalog, stock, true)].map(row => [row.code, row]))
  const query = search.trim().toLocaleLowerCase('pt-BR')
  const products = entries.filter(([code, product]) =>
    (category === 'all' || isSpringCode(code) === (category === 'springs')) &&
    `${code} ${searchableProductText(product)}`.toLocaleLowerCase('pt-BR').includes(query))

  return <div className="reference-products">
    <PageHeading section="CADASTRO" title="Produtos" subtitle="Consulte amortecedores e molas por código, tipo e situação." actions={
      <details className="products-shortcuts"><summary>Atalhos</summary><div>
        <Button icon="catalog" onClick={() => onOpen('catalog')}>{isAdministrator ? 'Editar' : 'Consultar'} aplicações de amortecedores</Button>
        <Button icon="products" onClick={() => onOpen('inventory')}>Estoque de amortecedores</Button>
        <Button icon="springs" onClick={() => onOpen('springs')}>Estoque de molas</Button>
      </div></details>
    }/>
    <Card className="products-card" aria-label="Catálogo de produtos">
      <div className="products-toolbar">
        <div className="products-filters" role="group" aria-label="Filtrar por tipo">
          {([{value: 'all', label: `Todos (${entries.length})`}, {value: 'shocks', label: `Amortecedores (${entries.length - springs})`}, {value: 'springs', label: `Molas (${springs})`}] as const).map(item =>
            <Button key={item.value} aria-pressed={category === item.value} onClick={() => setCategory(item.value)}>{item.label}</Button>)}
        </div>
        <div className="products-search-actions">
          <input type="search" aria-label="Buscar produto por código ou aplicação" placeholder="Buscar por código" value={search} onChange={event => setSearch(event.target.value)}/>
          {isAdministrator && <details className="products-create"><summary>Novo produto</summary><div>
            <p>Escolha o tipo para abrir o cadastro e a entrada inicial.</p>
            <Button onClick={() => onOpen('inventory')}>Amortecedor</Button>
            <Button onClick={() => onOpen('springs')}>Mola</Button>
          </div></details>}
        </div>
      </div>
      <Table aria-label="Produtos cadastrados">
        <thead><tr><th scope="col">Código</th><th scope="col">Tipo</th><th scope="col">Localização padrão</th><th scope="col">Quantidade</th><th scope="col">Mínimo</th><th scope="col">Situação</th></tr></thead>
        <tbody>{products.map(([code, product], index) => {
          const summary = summaries.get(code)!
          const status = summary.severity === 'zero' ? 'Sem estoque' : summary.minimum === null ? 'Sem mínimo definido' : summary.total < summary.minimum ? 'Abaixo do mínimo' : summary.total === summary.minimum ? 'No limite' : 'Adequado'
          const open = expanded === code
          const detailsId = `${prefix}-product-${index}`
          return <Fragment key={code}>
            <tr>
              <th scope="row"><button type="button" className="products-code" aria-label={`Detalhes de ${code}`} aria-expanded={open} aria-controls={detailsId} onClick={() => setExpanded(open ? null : code)}>{code}<span aria-hidden="true">{open ? '−' : '+'}</span></button></th>
              <td>{isSpringCode(code) ? 'Mola' : 'Amortecedor'}</td>
              <td>{product.defaultLocation || 'Não definida'}</td>
              <td>{summary.total} {summary.total === 1 ? 'caixa' : 'caixas'}</td>
              <td>{summary.minimum ?? 'Não informado'}</td>
              <td><Badge className={summary.severity === 'ok' ? 'products-status-neutral' : ''}>{status}</Badge></td>
            </tr>
            <tr id={detailsId} hidden={!open} className="products-detail-row"><td colSpan={6}>
              {open && <div className="products-detail"><ProductPhoto code={code}/><div><strong>Aplicações de {code}</strong><ProductApplications product={product}/><small>{summary.available} caixas disponíveis · {summary.awaiting} aguardando testagem</small></div><Button onClick={() => onOpen(isSpringCode(code) ? 'springs' : 'inventory')}>Ver estoque de {code} ↗</Button></div>}
            </td></tr>
          </Fragment>
        })}</tbody>
      </Table>
      {!products.length && <p className="products-empty" role="status">{entries.length ? 'Nenhum produto encontrado para esta busca ou tipo.' : 'Nenhum produto cadastrado.'}</p>}
      <p className="products-help" role="status">{products.length} {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'} · Toque no código para ver foto, aplicações e estoque.</p>
    </Card>
  </div>
}
