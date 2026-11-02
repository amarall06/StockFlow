import {supabase} from './supabase'
import {parseSharedLayout,validateSharedDraft,type SharedLayoutDraft} from './shared-layout'
export async function loadSharedLayout(signal:AbortSignal){
  if(!supabase)throw Error('Supabase não configurado.')
  const{data,error}=await supabase.from('presentation_layouts').select('scenario_key,revision,layout,capacities,updated_at,updated_by').eq('scenario_key','liber-presentation-v1').abortSignal(signal).single()
  if(error)throw error
  return parseSharedLayout(data)
}
export async function saveSharedLayout(draft:SharedLayoutDraft,requestId:string){
  if(!supabase)throw Error('Supabase não configurado.')
  const input=validateSharedDraft(draft),controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),15000)
  try{
    const{data,error}=await supabase.rpc('save_presentation_layout',{p_expected_revision:input.revision,p_layout:input.layout,p_capacities:input.capacities,p_request_id:requestId}).abortSignal(controller.signal)
    if(error){if(error.code==='40001')throw Error('A configuração mudou em outro aparelho. Seu preenchimento foi mantido. Feche e reabra a edição para usar a versão atual.');throw Error('Não foi possível confirmar a gravação. Seu preenchimento foi mantido; tente novamente para recuperar a mesma confirmação.')}
    return parseSharedLayout(data)
  }catch(caught){
    if(caught instanceof Error&&caught.message.startsWith('A configuração mudou em outro aparelho.'))throw caught
    throw Error('Não foi possível confirmar a gravação. Seu preenchimento foi mantido; tente novamente para recuperar a mesma confirmação.')
  }finally{window.clearTimeout(timeout)}
}
