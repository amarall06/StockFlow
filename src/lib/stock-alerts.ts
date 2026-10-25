import type { ProductInfo, StockRow } from './inventory-api'
import { isSpringCode } from './product-category'

export type StockAlert = { code:string; total:number; available:number; awaiting:number; minimum:number|null; severity:'zero'|'low'|'ok' }
export function calculateStockAlerts(catalog:Record<string,ProductInfo>,stock:StockRow[],springs:boolean):StockAlert[]{
  const totals=new Map<string,{total:number;available:number;awaiting:number}>()
  for(const row of stock){
    if(isSpringCode(row.code)!==springs||row.boxes<1)continue
    if(springs?row.status!=='Em estoque':!['Aguardando testagem','Liberado para venda'].includes(row.status))continue
    const current=totals.get(row.code)??{total:0,available:0,awaiting:0}
    current.total+=row.boxes
    if(row.status==='Aguardando testagem')current.awaiting+=row.boxes
    else current.available+=row.boxes
    totals.set(row.code,current)
  }
  // Parte do catálogo para incluir também produtos sem nenhuma linha de saldo.
  return Object.entries(catalog).filter(([code])=>isSpringCode(code)===springs).map(([code,product]):StockAlert=>{
    const total=totals.get(code)??{total:0,available:0,awaiting:0}
    const minimum=product.minimumBoxes??null
    return {code,...total,minimum,severity:total.total===0?'zero':minimum!==null&&total.total<=minimum?'low':'ok'}
  }).sort((a,b)=>({zero:0,low:1,ok:2}[a.severity]-{zero:0,low:1,ok:2}[b.severity]||a.code.localeCompare(b.code)))
}

// Vazio desativa o limite, mas zero continua sendo um limite configurado.
export function parseMinimum(value:string):number|null{
  if(!value.trim())return null
  const number=Number(value)
  if(!Number.isInteger(number)||number<0||number>2147483647)throw new Error('Informe caixas inteiras a partir de zero, ou deixe vazio para não configurar.')
  return number
}
