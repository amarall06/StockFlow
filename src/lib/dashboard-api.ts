import {supabase} from './supabase'
export type DashboardCategory='all'|'shocks'|'springs'
export type DashboardReport={
  as_of:string;period_start:string;sold_boxes:number;sales_count:number;
  sales_by_product:Array<{code:string;boxes:number}>;
  receipts:Array<{id:string;created_at:string;code:string;boxes:number;location:string|null;supplier:string|null;lot:string|null}>
}
export function validateDashboardReport(value:unknown):DashboardReport{
  if(!value||typeof value!=='object')throw new Error('O banco não confirmou o relatório.')
  const report=value as DashboardReport
  if(!Number.isFinite(Date.parse(report.as_of))||!Number.isFinite(Date.parse(report.period_start))
    ||!Number.isSafeInteger(report.sold_boxes)||report.sold_boxes<0||!Number.isSafeInteger(report.sales_count)||report.sales_count<0
    ||!Array.isArray(report.sales_by_product)||!Array.isArray(report.receipts)
    ||report.sales_by_product.some((row)=>!row||typeof row.code!=='string'||!Number.isSafeInteger(row.boxes)||row.boxes<1)
    ||report.receipts.some((row)=>!row||typeof row.id!=='string'||typeof row.code!=='string'||!Number.isFinite(Date.parse(row.created_at))||!Number.isSafeInteger(row.boxes)||row.boxes<1))throw new Error('O relatório chegou incompleto. Atualize o painel para tentar novamente.')
  return report
}
export async function loadDashboardReport(category:DashboardCategory){
  if(!['all','shocks','springs'].includes(category))throw new Error('Categoria inválida.')
  if(!supabase)throw new Error('Banco não configurado.')
  const {data,error}=await supabase.rpc('inventory_dashboard',{p_category:category})
  if(error)throw new Error('Não foi possível consultar vendas e entradas. Confira a conexão e tente atualizar.')
  return validateDashboardReport(data)
}
