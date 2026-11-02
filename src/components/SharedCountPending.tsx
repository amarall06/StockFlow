import type {SharedCount} from '../lib/presentation-counts'
import type {CountReview} from '../lib/presentation-count-reviews'
import type {RecountLink} from '../lib/presentation-recounts'

export function SharedCountPending({counts,reviews,links,canReview,canOperate,stale,onOpen}:{counts:SharedCount[];reviews:Record<string,CountReview>;links:RecountLink[];canReview:boolean;canOperate:boolean;stale:boolean;onOpen:(id:string)=>void}){
 const awaiting=counts.filter(count=>!reviews[count.id])
 const recounts=counts.filter(count=>reviews[count.id]?.decision==='recount_requested'&&!links.some(link=>link.parent_count_id===count.id))
 const pending=[...awaiting.map(count=>({count,kind:'review' as const})),...recounts.map(count=>({count,kind:'recount' as const}))]
 return <section className="shared-count-pending" aria-label="Pendências das contagens compartilhadas">
  <h3>Pendências de conferência</h3>
  <p role="status">{awaiting.length} envios aguardando revisão · {recounts.length} recontagens por iniciar.</p>
  <p>Apresentação: envios carregados e vínculos abertos nesta tela. Uma solicitação com recontagem já enviada sai da fila de início; o novo envio aguarda sua própria revisão.</p>
  {stale&&<p role="status">Pendências da consulta anterior; atualize as contagens antes de decidir.</p>}
  {!pending.length?<p>Nenhuma pendência nos registros desta consulta. Isso não confirma a conclusão do histórico completo.</p>:<ul aria-label="Fila de pendências de conferência">{pending.map(({count,kind})=><li key={count.id}>
   <strong>{count.location} — {kind==='review'?'Aguardando revisão':'Recontagem por iniciar'}</strong>
   <p>Envio de {count.actor_name} · {count.id}</p>
   <p>{kind==='review'?'Responsável pela decisão: Administrador.':'Responsável pela recontagem: Administrador ou Estoquista.'}</p>
   <button type="button" className="theme-toggle" onClick={()=>onOpen(count.id)}>{kind==='review'&&canReview?'Abrir contagem para revisão':kind==='recount'&&canOperate?'Abrir solicitação de recontagem':'Consultar pendência'} de {count.location}</button>
  </li>)}</ul>}
 </section>
}
