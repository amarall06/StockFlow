import {countFingerprint,type SharedCount,type CountSubmission} from './presentation-counts'
import {presentationFingerprint} from './presentation-bundle'
export type CountDecision='approved'|'recount_requested'
export type CountReview={id:string;request_id:string;count_id:string;reviewer_id:string;reviewer_name:string;decision:CountDecision;note:string;submission_snapshot:CountSubmission;reviewed_at:string}
export const reviewLabels:Record<CountDecision,string>={approved:'Aprovada na apresentação',recount_requested:'Recontagem solicitada'}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function reviewInput(count:SharedCount,decision:CountDecision,note:string,requestId:string){
  const normalized=note.trim()
  if(!uuid.test(requestId)||!uuid.test(count.id)||!Object.hasOwn(reviewLabels,decision)||normalized.length<5||normalized.length>1000)throw Error('Escolha a decisão e informe uma justificativa entre 5 e 1.000 caracteres.')
  return {p_count_id:count.id,p_expected_submission:structuredClone(count.submission),p_decision:decision,p_note:normalized,p_request_id:requestId}
}
export function parseCountReview(value:unknown,count:SharedCount):CountReview{
  const review=value as CountReview
  if(!review||!uuid.test(review.id)||!uuid.test(review.request_id)||!uuid.test(review.reviewer_id)||review.count_id!==count.id||typeof review.reviewer_name!=='string'||!review.reviewer_name.trim()||!Object.hasOwn(reviewLabels,review.decision)||typeof review.note!=='string'||review.note.trim().length<5||review.note.length>1000||typeof review.reviewed_at!=='string'||!Number.isFinite(Date.parse(review.reviewed_at))||!review.submission_snapshot||countFingerprint(review.submission_snapshot)!==countFingerprint(count.submission))throw Error('A revisão recebida não corresponde à contagem consultada. Preserve seu preenchimento e consulte novamente.')
  return review
}
// Revisões são imutáveis. Uma leitura atrasada não pode apagar uma confirmação local.
export function mergeCountReviews(previous:Record<string,CountReview>,incoming:CountReview[],counts:SharedCount[]){
  const result:Record<string,CountReview>={}
  for(const count of counts)if(previous[count.id])result[count.id]=parseCountReview(previous[count.id],count)
  for(const review of incoming){
    const count=counts.find(count=>count.id===review.count_id)
    if(!count)throw Error('Revisão sem a contagem correspondente.')
    parseCountReview(review,count)
    if(result[count.id]&&presentationFingerprint(result[count.id])!==presentationFingerprint(review))throw Error('O servidor retornou decisões incompatíveis. Consulte novamente antes de revisar.')
    result[count.id]=review
  }
  return result
}
