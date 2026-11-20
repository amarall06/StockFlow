import type {StockRow} from './inventory-api'

// Dados exclusivos da prévia. Nunca enviar ao banco ou usar nos totais do estoque.
export const warehouseDemoStock:StockRow[]=[
 {code:'AGM-35',location:'T03-A-1',status:'Aguardando testagem',boxes:6},
 {code:'AGM-35',location:'T04-C-2',status:'Liberado para venda',boxes:4},
 {code:'ARE-24',location:'T07-B-3',status:'Liberado para venda',boxes:3},
 {code:'AFI-18',location:'T11-D-4',status:'Liberado para venda',boxes:2},
 {code:'AFR-42',location:'T16-A-1',status:'Aguardando testagem',boxes:5},
 {code:'AGM-10',location:'T09-C-2',status:'Liberado para venda',boxes:7},
]
