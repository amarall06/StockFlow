import {beginShelfCount,type ShelfCount} from './shelf-count'
import type {SharedCount} from './presentation-counts'
import {presentationBundle,presentationFingerprint} from './presentation-bundle'
import {parseCountReview,type CountReview} from './presentation-count-reviews'
export type RecountLink={parent_count_id:string;child_count_id:string;parent_review_id:string;created_by:string;created_at:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function beginPresentationRecount(userId:string,parent:SharedCount,review:CountReview,existing:ShelfCount|null,consultedAt:string){
  if(existing)throw Error('Já existe um rascunho neste aparelho. Continue-o ou descarte-o explicitamente no editor antes de iniciar outra contagem.')
  parseCountReview(review,parent)
  if(review.count_id!==parent.id||review.decision!=='recount_requested')throw Error('A origem não tem uma solicitação de recontagem válida.')
  const draft=beginShelfCount(userId,parent.location,presentationBundle.stock,consultedAt)
  return {...draft,recountOf:parent.id}
}
export function parseRecountLink(value:unknown,counts:SharedCount[]):RecountLink{
  const link=value as RecountLink
  if(!link||![link.parent_count_id,link.child_count_id,link.parent_review_id,link.created_by].every(id=>typeof id==='string'&&uuid.test(id))||link.parent_count_id===link.child_count_id||typeof link.created_at!=='string'||!Number.isFinite(Date.parse(link.created_at)))throw Error('Vínculo de recontagem inválido.')
  const parent=counts.find(count=>count.id===link.parent_count_id),child=counts.find(count=>count.id===link.child_count_id)
  if(!parent&&!child)throw Error('Vínculo sem contagem consultada.')
  if(child&&(child.submission.recount_of!==link.parent_count_id||child.actor_id!==link.created_by))throw Error('Recontagem vinculada a outra origem ou responsável.')
  if(parent&&child&&(parent.location!==child.location||parent.scenario_key!==child.scenario_key||parent.scenario_revision!==child.scenario_revision))throw Error('Origem e recontagem possuem referências incompatíveis.')
  return link
}
export function mergeRecountLinks(previous:RecountLink[],incoming:RecountLink[],counts:SharedCount[]){
  const links:RecountLink[]=[]
  for(const link of [...previous.filter(link=>counts.some(count=>count.id===link.parent_count_id||count.id===link.child_count_id)),...incoming]){
    parseRecountLink(link,counts)
    const same=links.find(item=>item.parent_count_id===link.parent_count_id||item.child_count_id===link.child_count_id)
    if(same&&presentationFingerprint(same)!==presentationFingerprint(link))throw Error('Vínculos de recontagem incompatíveis. Consulte novamente.')
    if(!same)links.push(link)
  }
  for(const count of counts)if(count.submission.recount_of&&!links.some(link=>link.child_count_id===count.id&&link.parent_count_id===count.submission.recount_of))throw Error('A recontagem chegou sem o vínculo de origem. Consulte novamente.')
  // Detecta ciclos também em respostas incompletas, sem depender da ordem da lista.
  for(const link of links){const seen=new Set<string>();let id:string|undefined=link.parent_count_id;while(id){if(seen.has(id))throw Error('Ciclo na sequência de recontagens.');seen.add(id);id=links.find(item=>item.parent_count_id===id)?.child_count_id}}
  return links
}
