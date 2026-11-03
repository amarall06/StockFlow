import{expect,type Page}from'@playwright/test'
import{readFileSync}from'node:fs'
import{prepareKeyboardPage}from'./keyboard'
const base=JSON.parse(readFileSync(new URL('../../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
export async function prepareRedesign(page:Page,theme:'light'|'dark'|'system'='light'){
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
 await page.routeWebSocket('wss://stockflow-test.supabase.co/**',socket=>socket.close())
 if(theme!=='system')await page.addInitScript(value=>localStorage.setItem('liber-automotive-theme',value),theme)
 const codes=['AGM-35','AFI-89','AGM-41','AGM-52','MGM-35','MFR-57','MGM-44','MFI-61'],quantities=[18,12,5,3,5,3,4,3]
 const products=codes.map((code,i)=>({id:`p${i}`,code,application:`Aplicação cadastrada ${i+1}`,default_location_id:`l${i%4}`,updated_at:'2026-11-02T12:00:00Z',minimum_boxes:[10,8,4,3,5,5,3,2][i]}))
 const stock=products.map((product,i)=>({product_id:product.id,location_id:`l${i%4}`,status_code:i>=4?'in_stock':i===2?'awaiting_test':'released_for_sale',quantity:quantities[i]}))
 const report={as_of:'2026-11-02T12:00:00Z',period_start:'2026-10-03T12:00:00Z',sold_boxes:44,sales_count:4,sales_by_product:[{code:'AGM-35',boxes:18},{code:'MGM-35',boxes:5},{code:'AFI-89',boxes:12},{code:'MFR-57',boxes:9}],receipts:Array.from({length:5},(_,i)=>({id:`r${i}`,created_at:new Date(Date.UTC(2026,10,2-i,15)).toISOString(),code:codes[i],boxes:[10,8,5,12,6][i],location:'NORTE',supplier:'Fornecedor cadastrado',lot:`LOTE-${i+1}`}))}
 const daily=(days:number)=>Array.from({length:days},(_,i)=>({day:new Date(Date.UTC(2026,10,3-days+i)).toISOString().slice(0,10),sold_boxes:[2,4,10,0,5,18,5][i%7],received_boxes:[10,8,0,5,12,6,0][i%7]}))
 const layout={scenario_key:'liber-inventory-v1',revision:1,layout:base.payload.floorPlan,capacities:{},updated_at:'2026-11-02T12:00:00Z',updated_by:null}
 const writes=await prepareKeyboardPage(page,{products,locations:['NORTE','SUL','LESTE','OESTE'].map((code,i)=>({id:`l${i}`,code,is_active:true})),stock_balances:stock,inventory_dashboard:report,inventory_activity_daily:daily(7),inventory_layouts:layout})
 const state={report,stock,reads:[] as {name:string;input:any}[],errors,writes,failReport:false,holdReport:null as Promise<void>|null}
 await page.route('**/rest/v1/rpc/inventory_dashboard',async route=>{const input=route.request().postDataJSON();state.reads.push({name:'dashboard',input});if(state.holdReport)await state.holdReport;return state.failReport?route.fulfill({status:403,json:{message:'Consulta indisponível'}}):route.fulfill({json:state.report})})
 await page.route('**/rest/v1/rpc/inventory_activity_daily',route=>{const input=route.request().postDataJSON();state.reads.push({name:'activity',input});return route.fulfill({json:daily(input.p_days)})})
 await page.route('**/rest/v1/presentation_scenarios*',route=>route.fulfill({json:base}))
 await page.route('**/rest/v1/presentation_layouts*',route=>route.fulfill({json:{...layout,scenario_key:base.scenario_key,capacities:base.payload.capacities}}))
 await page.reload()
 await expect(page.locator('.dashboard-stock-totals')).toContainText('53')
 await expect(page.locator('.dashboard-sales-table')).toBeVisible()
 await page.evaluate(()=>document.fonts.ready)
 return state
}
