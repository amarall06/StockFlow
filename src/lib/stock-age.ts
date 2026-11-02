import type { StockRow } from './inventory-api'
export type StockAgeGroup = { id: string; code: string; location: string; status: StockRow['status']; boxes: number; receivedOn: string | null }
export const stockAgeReference = '2026-11-02'
export const sampleStockAgeGroups: StockAgeGroup[] = [
  { id:'E-01',code:'AGM-35',location:'NORTE',status:'Aguardando testagem',boxes:8,receivedOn:'2026-10-31' },
  { id:'E-02',code:'AGM-35',location:'NORTE',status:'Aguardando testagem',boxes:7,receivedOn:'2026-10-25' },
  { id:'E-03',code:'AGM-35',location:'NORTE',status:'Aguardando testagem',boxes:3,receivedOn:'2026-10-17' },
  { id:'E-04',code:'AGM-35',location:'NORTE',status:'Aguardando testagem',boxes:2,receivedOn:null },
  { id:'E-05',code:'AGM-35',location:'NORTE',status:'Liberado para venda',boxes:15,receivedOn:'2026-07-15' },
  { id:'E-06',code:'AGM-35',location:'NORTE',status:'Liberado para venda',boxes:5,receivedOn:'2026-10-28' },
  { id:'E-07',code:'MGM-35',location:'SUL',status:'Em estoque',boxes:9,receivedOn:'2026-09-01' },
  { id:'E-08',code:'MGM-35',location:'SUL',status:'Em estoque',boxes:3,receivedOn:'2026-10-28' },
  { id:'E-09',code:'AGM-35',location:'LESTE',status:'Liberado para venda',boxes:20,receivedOn:'2026-07-01' },
  { id:'E-10',code:'AGM-35',location:'LESTE',status:'Liberado para venda',boxes:13,receivedOn:null },
]
const keyOf = (row: { code: string; location: string; status: string }) => JSON.stringify([row.code,row.location,row.status])
function calendarDay(value: string) {
  const milliseconds = Date.parse(value+'T00:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0,10)!==value) throw Error('Data de entrada inválida na permanência.')
  return milliseconds/86400000
}
export function validateStockAgeDays(days: number) {
  if (!Number.isSafeInteger(days) || days<1 || days>3650) throw Error('Informe um limite inteiro entre 1 e 3650 dias corridos.')
  return days
}
export function stockAgeRows(groups: StockAgeGroup[], stock: StockRow[], days: number, reference: string) {
  validateStockAgeDays(days)
  const referenceDay=calendarDay(reference), remaining=new Map<string,number>(), ids=new Set<string>()
  for (const row of stock) {
    const total=(remaining.get(keyOf(row))??0)+row.boxes
    if (!Number.isSafeInteger(row.boxes) || row.boxes<0 || !Number.isSafeInteger(total)) throw Error('Saldo inválido na referência de permanência.')
    remaining.set(keyOf(row),total)
  }
  const rows=groups.map(group=>{
    const key=keyOf(group), balance=remaining.get(key)
    if (!group.id || ids.has(group.id) || !Number.isSafeInteger(group.boxes) || group.boxes<1 || balance===undefined || group.boxes>balance) throw Error('Grupos de entrada não correspondem ao saldo por produto, local e situação.')
    ids.add(group.id);remaining.set(key,balance-group.boxes)
    const age=group.receivedOn===null?null:referenceDay-calendarDay(group.receivedOn)
    const situation=age===null?'unknown':age<0?'future':age>=days?'older':'recent'
    return {...group,age,situation} as const
  })
  if ([...remaining.values()].some(boxes=>boxes!==0)) throw Error('Há caixas sem grupo de origem. Preserve a referência para conferência.')
  return rows.sort((a,b)=>(b.age??-Infinity)-(a.age??-Infinity)||a.id.localeCompare(b.id))
}
export const stockAgeKey=(userId:string)=>`liber:stock-age:v1:${userId}`
export function readStockAgeRaw(userId:string){try{return localStorage.getItem(stockAgeKey(userId))}catch{return '!unavailable'}}
export function parseStockAgeDays(raw:string|null,userId:string){
  if(raw===null)return 90
  const value=JSON.parse(raw)
  if(!value||value.version!==1||value.userId!==userId)throw Error('Configuração de permanência inválida.')
  return validateStockAgeDays(value.days)
}
export function subscribeStockAge(listener:()=>void){
  for(const event of ['storage','focus','liber:stock-age'])window.addEventListener(event,listener)
  return()=>{for(const event of ['storage','focus','liber:stock-age'])window.removeEventListener(event,listener)}
}
export function saveStockAgeDays(userId:string,days:number,expected:string|null){
  validateStockAgeDays(days)
  if(!userId||readStockAgeRaw(userId)!==expected)throw Error('O limite mudou em outra aba. Confira a configuração atual.')
  const raw=JSON.stringify({version:1,userId,days})
  localStorage.setItem(stockAgeKey(userId),raw)
  if(readStockAgeRaw(userId)!==raw)throw Error('O navegador não confirmou a gravação do limite.')
  window.dispatchEvent(new Event('liber:stock-age'))
}
