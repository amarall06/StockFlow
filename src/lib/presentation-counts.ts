import {parseShelfCount,type ShelfCount,countSummary} from './shelf-count'
import {presentationBundle,presentationFingerprint} from './presentation-bundle'
export type CountSubmission={source_id:string;scenario_revision:1;location:string;rows:ShelfCount['rows'];notes:string;consulted_at:string;started_at:string;recount_of?:string}
export type SharedCount={id:string;actor_id:string;actor_name:string;source_id:string;scenario_key:string;scenario_revision:1;location:string;submission:CountSubmission;state:'awaiting_review';created_at:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function countSubmission(draft:ShelfCount):CountSubmission{
  parseShelfCount(JSON.stringify(draft),draft.userId)
  if(!uuid.test(draft.id)||!presentationBundle.locations.includes(draft.location)||countSummary(draft).pending)throw Error('Preencha todos os itens da contagem antes de enviar.')
  const reference=presentationBundle.stock.filter(row=>row.location===draft.location)
  if(draft.rows.some(row=>!presentationBundle.stock.some(base=>base.code===row.code)||row.expected!==reference.filter(base=>base.code===row.code&&base.status===row.status).reduce((sum,base)=>sum+base.boxes,0))||reference.some(base=>!draft.rows.some(row=>row.code===base.code&&row.status===base.status)))throw Error('A referência da contagem diverge do cenário publicado.')
  return {source_id:draft.id,scenario_revision:1,location:draft.location,rows:structuredClone(draft.rows),notes:draft.notes,consulted_at:draft.consultedAt,started_at:draft.startedAt,...(draft.recountOf?{recount_of:draft.recountOf}:{})}
}
export const countFingerprint=(submission:CountSubmission)=>presentationFingerprint(submission)
export function parseSharedCount(value:unknown):SharedCount{
  const row=value as SharedCount
  if(!row||!uuid.test(row.id)||!uuid.test(row.actor_id)||!uuid.test(row.source_id)||row.scenario_key!=='liber-presentation-v1'||row.scenario_revision!==1||row.state!=='awaiting_review'||typeof row.actor_name!=='string'||!Number.isFinite(Date.parse(row.created_at))||!row.submission||row.submission.source_id!==row.source_id||row.submission.location!==row.location||row.submission.scenario_revision!==1)throw Error('O servidor retornou uma contagem incompleta. Consulte novamente.')
  const s=row.submission
  if(!Array.isArray(s.rows))throw Error('O servidor retornou itens inválidos.')
  // A referência é reconstruída dos valores esperados que vieram do servidor.
  const draft:ShelfCount={version:1,userId:row.actor_id,id:row.source_id,location:row.location,consultedAt:s.consulted_at,startedAt:s.started_at,notes:s.notes,rows:s.rows,reference:JSON.stringify(s.rows.filter(r=>r.expected>0).map(r=>({code:r.code,status:r.status,boxes:r.expected}))),...(s.recount_of!==undefined?{recountOf:s.recount_of}:{})}
  countSubmission(draft)
  return row
}
