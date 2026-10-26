import {supabase} from './supabase'
import {validateTurnoverReport,type TurnoverCategory,type TurnoverDays} from './turnover'

export async function loadTurnover(category:TurnoverCategory,days:TurnoverDays){
  if(!['all','shocks','springs'].includes(category)||![30,90,180].includes(days))throw new Error('Categoria ou período inválido.')
  if(!supabase)throw new Error('Serviço de dados não configurado.')
  const {data,error}=await supabase.rpc('inventory_turnover',{p_category:category,p_days:days})
  if(error)throw new Error(error.code==='42501'?'Sua conta precisa estar ativa para consultar os indicadores.':'Não foi possível consultar os indicadores. Confira a conexão e tente atualizar.')
  const report=validateTurnoverReport(data)
  if(report.category!==category||report.days!==days)throw new Error('O período recebido não corresponde ao solicitado. Atualize novamente.')
  return report
}
