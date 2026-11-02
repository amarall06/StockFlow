import type { StockRow } from '../lib/inventory-api'
export function LocationStockSummary({ locations, stock, springs }: { locations: string[]; stock: StockRow[]; springs: boolean }) {
  return <>
    <p>Quantidades em caixas por situação. Esta separação na consulta não altera a organização física. Saldo zero não comprova espaço disponível.</p>
    <div className="location-list" aria-label="Prateleiras cadastradas">{locations.map(location => {
      const rows = stock.filter(row => row.location === location)
      const total = rows.reduce((sum, row) => sum + row.boxes, 0)
      const awaiting = rows.filter(row => row.status === 'Aguardando testagem').reduce((sum, row) => sum + row.boxes, 0)
      const released = rows.filter(row => row.status === 'Liberado para venda').reduce((sum, row) => sum + row.boxes, 0)
      return <span className="location-chip" role="group" aria-label={`Resumo da prateleira ${location}`} key={location}>
        <strong>{location}</strong><small>{total} caixas no total</small>
        {springs ? <small>Em estoque: {total} caixas</small> : <><small>Aguardando testagem: {awaiting} caixas</small><small>Liberado para venda: {released} caixas</small>{awaiting > 0 && released > 0 && <small>Duas situações nesta localização</small>}</>}
      </span>
    })}</div>
  </>
}
