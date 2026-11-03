import {supabase} from './supabase'
import {validateRecurrenceRule,type RecurrenceRule} from './recurring-divergences'
export type SharedRecurrence = {revision:number;rule:RecurrenceRule;updatedAt:string}
export function parseSharedRecurrence(value:unknown):SharedRecurrence{
 const row=value as Record<string,unknown>|null
 if(!row||row.scenario_key!=='liber-presentation-v1'||!Number.isSafeInteger(row.revision)||Number(row.revision)<1||typeof row.updated_at!=='string'||!Number.isFinite(Date.parse(row.updated_at)))throw Error('Configuração compartilhada inválida.')
 const rule=validateRecurrenceRule({occurrences:row.occurrences as number,days:row.days as number})
 return{revision:row.revision as number,rule,updatedAt:row.updated_at}
}
export function newestRecurrence(previous:SharedRecurrence|null,next:SharedRecurrence){
 if(previous&&previous.revision>next.revision)return previous
 if(previous&&previous.revision===next.revision&&JSON.stringify(previous)!==JSON.stringify(next))throw Error('Versão da regra inconsistente.')
 return next
}
async function timed<T>(request:(signal:AbortSignal)=>PromiseLike<T>){
 const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),15000)
 try{return await request(controller.signal)}finally{window.clearTimeout(timer)}
}
export async function loadSharedRecurrence(){
 if(!supabase)throw Error('Banco não configurado.')
 const client=supabase
 const{data,error}=await timed(signal=>client.from('presentation_recurrence_rules').select('scenario_key,revision,occurrences,days,updated_at').eq('scenario_key','liber-presentation-v1').abortSignal(signal).single())
 if(error)throw error
 return parseSharedRecurrence(data)
}
export async function saveSharedRecurrence(snapshot:SharedRecurrence,rule:RecurrenceRule,requestId:string){
 if(!supabase)throw Error('Banco não configurado.')
 validateRecurrenceRule(rule)
 const client=supabase
 try{
  const{data,error}=await timed(signal=>client.rpc('save_presentation_recurrence_rule',{p_expected_revision:snapshot.revision,p_occurrences:rule.occurrences,p_days:rule.days,p_request_id:requestId}).abortSignal(signal))
  if(error){if(error.code==='40001')throw Error('A regra mudou em outro aparelho. Seu preenchimento foi mantido. Feche a edição e atualize a regra antes de revisar.');throw error}
  return parseSharedRecurrence(data)
 }catch(caught){if(caught instanceof Error&&caught.message.startsWith('A regra mudou em outro aparelho.'))throw caught;throw Error('Não foi possível confirmar. Seu preenchimento foi mantido; tente novamente para recuperar a mesma confirmação.')}
}
