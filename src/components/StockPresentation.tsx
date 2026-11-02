import { ShelfCapacity } from './ShelfCapacity'
import { demoLocations, demoStock } from '../lib/shelf-capacity'
import './StockPresentation.css'
import { PickMissions } from './PickMissions'
export function StockPresentation({ userId, canEdit, canPick = canEdit }: { userId: string; canEdit: boolean; canPick?: boolean }) {
  const total = demoStock.reduce((sum, row) => sum + row.boxes, 0)
  const awaiting = demoStock.filter(row => row.status === 'Aguardando testagem').reduce((sum, row) => sum + row.boxes, 0)
  return <section className="stock-presentation" aria-label="Apresentação do estoque">
    <section className="presentation-metrics" aria-label="Indicadores do estoque">
      {[['Caixas em estoque', total], ['Disponíveis para venda', total - awaiting], ['Aguardando testagem', awaiting], ['Prateleiras', demoLocations.length]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </section>
    <section className="inventory-panel dashboard-panel" aria-label="Produtos da apresentação"><h2>Produtos</h2><p>Consulte os códigos no mapa para localizar prateleiras e situações.</p>
      <ul>{[{ code: 'AGM-35', name: 'Amortecedor' }, { code: 'MGM-35', name: 'Mola' }].map(product => {
        const rows = demoStock.filter(row => row.code === product.code)
        return <li key={product.code}><strong>{product.code}</strong> — {product.name}; {rows.reduce((sum, row) => sum + row.boxes, 0)} caixas; locais: {[...new Set(rows.map(row => row.location))].join(', ')}.</li>
      })}</ul>
    </section>
    <PickMissions key={userId} userId={userId} stock={demoStock} canOperate={canPick}/>
    <ShelfCapacity userId={userId} locations={demoLocations} stock={demoStock} canEdit={canEdit} demoOnly/>
  </section>
}
