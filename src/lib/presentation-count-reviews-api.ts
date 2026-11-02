import {supabase} from './supabase'
import {parseCountReview,reviewInput,type CountDecision,type CountReview} from './presentation-count-reviews'
import type {SharedCount} from './presentation-counts'
export async function loadCountReviews(counts:SharedCount[],signal:AbortSignal){
  if(!counts.length)return []
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const reviews:CountReview[]=[]
  for(let offset=0;offset<counts.length;offset+=50){
  const {data,error}=await supabase.from('presentation_count_reviews').select('*').in('count_id',counts.slice(offset,offset+50).map(count=>count.id)).order('count_id').abortSignal(signal)
  if(error||!Array.isArray(data))throw Error('Não foi possível consultar as decisões das contagens.')
  reviews.push(...data.map(value=>{
    const count=counts.find(count=>count.id===value.count_id)
    if(!count)throw Error('Revisão sem contagem correspondente.')
    return parseCountReview(value,count)
  }))
  }
  return reviews
}
export async function reviewPresentationCount(count:SharedCount,decision:CountDecision,note:string,requestId:string){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const input=reviewInput(count,decision,note,requestId)
  const {data,error}=await supabase.rpc('review_presentation_count',input).abortSignal(AbortSignal.timeout(15000))
  if(error){
    if(error.code==='40001')throw Error('Esta contagem já foi revisada ou a referência diverge. Seu preenchimento foi mantido; atualize as contagens para conferir a decisão existente.')
    if(error.code==='42501')throw Error('Sua conta não pode revisar esta contagem. Confira se continua ativa e com a função Administrador.')
    if(error.code==='22023')throw Error('A revisão não foi aceita. Confira a justificativa e a referência; a identificação da tentativa não pode ser reutilizada com outros dados.')
    throw Error('Não foi possível confirmar a revisão. Mantenha decisão e justificativa e tente novamente para recuperar a mesma confirmação.')
  }
  const receipt=parseCountReview(data,count)
  if(receipt.request_id!==requestId||receipt.decision!==decision||receipt.note!==input.p_note)throw Error('O servidor retornou outra confirmação. Mantenha seu preenchimento e consulte as decisões.')
  return receipt
}
