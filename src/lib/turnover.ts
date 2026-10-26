export type TurnoverCategory='all'|'shocks'|'springs'
export type TurnoverDays=30|90|180
export type TurnoverProduct={code:string;registered_at:string;sold_boxes:number;sales_count:number;last_sale_at:string|null;stock_boxes:number}
export type TurnoverReport={as_of:string;period_start:string;days:TurnoverDays;category:TurnoverCategory;products:TurnoverProduct[]}
export type AbcClass='A'|'B'|'C'|'none'
export type RankedProduct=TurnoverProduct&{abc:AbcClass;share:number;cumulative:number;daily:number}
const integer=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0
const date=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))

export function validateTurnoverReport(value:unknown):TurnoverReport {
  const fail=()=>{throw new Error('Os indicadores chegaram incompletos. Atualize para tentar novamente.')}
  if(!value||typeof value!=='object')return fail()
  const report=value as TurnoverReport
  if(!date(report.as_of)||!date(report.period_start)||!['all','shocks','springs'].includes(report.category)
    ||![30,90,180].includes(report.days)||!Array.isArray(report.products))return fail()
  const end=Date.parse(report.as_of),start=Date.parse(report.period_start)
  if(Math.abs(end-start-report.days*86400000)>1000)return fail()
  const codes=new Set<string>()
  for(const row of report.products){
    if(!row||typeof row.code!=='string'||! /^[A-Z]{3}-(100|[1-9][0-9]?)$/.test(row.code)
      ||codes.has(row.code)||!date(row.registered_at)||Date.parse(row.registered_at)>end
      ||!integer(row.sold_boxes)||!integer(row.sales_count)||!integer(row.stock_boxes)
      ||row.sales_count>row.sold_boxes||(row.sold_boxes===0)!==(row.sales_count===0)
      ||(row.last_sale_at!==null&&(!date(row.last_sale_at)||Date.parse(row.last_sale_at)>end))
      ||(row.sold_boxes>0&&(row.last_sale_at===null||Date.parse(row.last_sale_at)<start)))return fail()
    const spring=['MGM','MFI','MRE','MFR'].includes(row.code.split('-')[0])
    if(report.category==='springs'&&!spring||report.category==='shocks'&&spring)return fail()
    codes.add(row.code)
  }
  if(!Number.isSafeInteger(report.products.reduce((sum,row)=>sum+row.sold_boxes,0)))return fail()
  return report
}

// ABC por volume vendido. Empates ficam na mesma classe, sem prioridade arbitrária por código.
export function rankTurnover(report:TurnoverReport):RankedProduct[] {
  const rows=[...report.products].sort((a,b)=>b.sold_boxes-a.sold_boxes||a.code.localeCompare(b.code))
  const total=rows.reduce((sum,row)=>sum+row.sold_boxes,0)
  let accumulated=0,groupBefore=0,previous=-1
  return rows.map(row=>{
    if(row.sold_boxes!==previous){groupBefore=accumulated;previous=row.sold_boxes}
    const abc:AbcClass=row.sold_boxes===0?'none':groupBefore/total<.8?'A':groupBefore/total<.95?'B':'C'
    accumulated+=row.sold_boxes
    return {...row,abc,share:total?row.sold_boxes/total*100:0,cumulative:total?accumulated/total*100:0,daily:row.sold_boxes/report.days}
  })
}
export function daysWithoutSale(row:TurnoverProduct,asOf:string):number|null {
  return row.last_sale_at===null?null:Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(row.last_sale_at))/86400000))
}
