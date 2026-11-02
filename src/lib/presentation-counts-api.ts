import {supabase} from './supabase'
import {countSubmission,countFingerprint,parseSharedCount,type CountSubmission} from './presentation-counts'
import type {ShelfCount} from './shelf-count'
export async function loadPresentationCounts(signal:AbortSignal){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const {data,error}=await supabase.from('presentation_shelf_counts').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50).abortSignal(signal)
  if(error||!Array.isArray(data))throw Error('Não foi possível consultar as contagens compartilhadas. Confira sua conexão e seu acesso.')
  return data.map(parseSharedCount)
}
export async function submitPresentationCount(draft:ShelfCount){return submitCountPayload(countSubmission(draft))}
export async function submitCountPayload(submission:CountSubmission){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const {data,error}=await supabase.rpc('submit_presentation_shelf_count',{p_submission:submission}).abortSignal(AbortSignal.timeout(15000))
  if(error){
    if(error.code==='40001')throw Error('Esta contagem já foi enviada com outros valores ou a referência diverge. Preserve o rascunho e consulte os envios antes de iniciar outra contagem.')
    if(error.code==='42501')throw Error('Sua conta não pode enviar esta contagem. Confira sua função e se o acesso continua ativo.')
    throw Error('Não foi possível confirmar o envio. O rascunho foi mantido; tente novamente sem alterar os valores para recuperar a mesma confirmação.')
  }
  const confirmed=parseSharedCount(data)
  if(countFingerprint(confirmed.submission)!==countFingerprint(submission))throw Error('O servidor retornou outra confirmação. Preserve o rascunho e consulte os envios antes de tentar novamente.')
  return confirmed
}
