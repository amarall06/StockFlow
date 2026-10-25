import type {ProductInfo,StockRow} from './inventory-api'
import {calculateStockAlerts} from './stock-alerts'
import type {DashboardCategory} from './dashboard-api'

export function dashboardStockSummary(catalog:Record<string,ProductInfo>,stock:StockRow[],category:DashboardCategory){
  const rows=[...(category!=='springs'?calculateStockAlerts(catalog,stock,false):[]),...(category!=='shocks'?calculateStockAlerts(catalog,stock,true):[])]
  return {products:rows.length,boxes:rows.reduce((sum,row)=>sum+row.total,0),zeros:rows.filter((row)=>row.severity==='zero').length,
    low:rows.filter((row)=>row.severity==='low').length,alerts:rows.filter((row)=>row.severity!=='ok').sort((a,b)=>Number(b.severity==='zero')-Number(a.severity==='zero')||a.code.localeCompare(b.code))}
}
