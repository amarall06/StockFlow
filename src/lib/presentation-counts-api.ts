import {supabase} from './supabase'
import {countSubmission,countFingerprint,parseSharedCount,type CountSubmission,type SharedCount} from './presentation-counts'
import type {ShelfCount} from './shelf-count'
export async function loadPresentationCounts(signal:AbortSignal,limit=50){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  if(!Number.isSafeInteger(limit)||limit<1)throw Error('Limite de consulta inválido.')
  const rows:SharedCount[]=[],seen=new Set<string>()
  while(rows.length<limit){
    const size=Math.min(50,limit-rows.length),cursor=rows.at(-1)
    let query=supabase.from('presentation_shelf_counts').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(size)
    if(cursor){
      // Preserva microssegundos do servidor; arredondar a data poderia pular envios.
      if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(cursor.created_at))throw Error('Data de continuação inválida.')
      query=query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
    }
    const {data,error}=await query.abortSignal(signal)
    if(error||!Array.isArray(data)||data.length>size)throw Error('Não foi possível consultar as contagens compartilhadas. Confira sua conexão e seu acesso.')
    for(const value of data){const count=parseSharedCount(value);if(seen.has(count.id))throw Error('O histórico retornou envios repetidos. Atualize para tentar novamente.');seen.add(count.id);rows.push(count)}
    if(data.length<size)break
  }
  return rows
}
export async function submitPresentationCount(draft:ShelfCount){return submitCountPayload(countSubmission(draft))}
export async function submitCountPayload(submission:CountSubmission){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const {data,error}=await supabase.rpc('submit_presentation_shelf_count',{p_submission:submission}).abortSignal(AbortSignal.timeout(15000))
  if(error){
    if(error.code==='40001')throw Error(submission.recount_of?'A solicitação de recontagem já foi atendida ou a origem diverge. Preserve o rascunho e consulte o histórico.':'Esta contagem já foi enviada com outros valores ou a referência diverge. Preserve o rascunho e consulte os envios antes de iniciar outra contagem.')
    if(error.code==='42501')throw Error('Sua conta não pode enviar esta contagem. Confira sua função e se o acesso continua ativo.')
    throw Error('Não foi possível confirmar o envio. O rascunho foi mantido; tente novamente sem alterar os valores para recuperar a mesma confirmação.')
  }
  const confirmed=parseSharedCount(data)
  if(countFingerprint(confirmed.submission)!==countFingerprint(submission))throw Error('O servidor retornou outra confirmação. Preserve o rascunho e consulte os envios antes de tentar novamente.')
  return confirmed
}
