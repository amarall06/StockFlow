import {useEffect,useRef,useState} from 'react'
import type {SharedCount} from '../lib/presentation-counts'
import {reviewLabels,type CountReview,type CountDecision} from '../lib/presentation-count-reviews'
import {reviewPresentationCount} from '../lib/presentation-count-reviews-api'
const date=(value:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(value))
export function PresentationCountReview({count,review,canReview,ready,onReviewed}:{count:SharedCount;review?:CountReview;canReview:boolean;ready:boolean;onReviewed:(review:CountReview,count:SharedCount)=>void}){
  const[editing,setEditing]=useState<SharedCount|null>(null),[decision,setDecision]=useState<CountDecision>('approved'),[note,setNote]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false)
  const busy=useRef(false),alive=useRef(true),attempt=useRef<{fingerprint:string;id:string}|null>(null)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  const fingerprint=JSON.stringify([editing?.id,decision,note.trim()])
  return <section className="presentation-count-review" aria-label={`Revisão de ${count.location}`}>
    {review&&<div role="status"><h4>{reviewLabels[review.decision]}</h4><p>Revisado por {review.reviewer_name} em {date(review.reviewed_at)} (America/Bahia).</p><p>Justificativa: {review.note}</p><p>Decisão: {review.id}. Nenhum saldo foi alterado.</p></div>}
    {canReview&&!review&&!editing&&<button className="theme-toggle" type="button" disabled={!ready} onClick={()=>{setEditing(structuredClone(count));setError('');setConfirmation('');attempt.current=null}}>Revisar contagem de {count.location}</button>}
    {canReview&&editing&&<form aria-label={`Revisar contagem de ${count.location}`} onSubmit={async event=>{
      event.preventDefault();if(busy.current||!ready||review||confirmation!==fingerprint)return
      if(!navigator.onLine){setError('Conecte antes de confirmar a revisão. Seu preenchimento foi mantido.');return}
      busy.current=true;setPending(true);setError('')
      try{
        if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()}
        const receipt=await reviewPresentationCount(editing,decision,note,attempt.current.id)
        if(alive.current){onReviewed(receipt,editing);setEditing(null)}
      }catch(caught){if(alive.current)setError(caught instanceof Error?caught.message:'Não foi possível confirmar a revisão.')}
      finally{busy.current=false;if(alive.current)setPending(false)}
    }}>
      <h4>Decidir sobre a contagem de {count.location}</h4>
      <p>Na apresentação, o Administrador pode revisar inclusive as contagens da própria conta. A decisão é final para este envio; uma recontagem deve ser registrada como outra contagem. Aprovar não ajusta caixas nem libera operações reais.</p>
      {review&&<p role="alert">Outra revisão já foi registrada. Seu preenchimento foi preservado para consulta; esta edição não substituirá a decisão existente.</p>}
      <fieldset disabled={pending}><legend>Decisão e justificativa</legend>
        <label>Decisão da revisão<select value={decision} onChange={event=>setDecision(event.target.value as CountDecision)}><option value="approved">Aprovar contagem na apresentação</option><option value="recount_requested">Solicitar recontagem</option></select></label>
        <label>Justificativa da revisão<textarea required minLength={5} maxLength={1000} value={note} onChange={event=>setNote(event.target.value)}/></label>
        <label><input type="checkbox" required checked={confirmation===fingerprint} onChange={event=>setConfirmation(event.target.checked?fingerprint:'')}/>Conferi os itens e confirmo esta decisão somente para a apresentação, sem ajustar o estoque.</label>
        <button type="submit" className="theme-toggle" disabled={!ready||Boolean(review)||note.trim().length<5||confirmation!==fingerprint}>{pending?'Confirmando revisão…':'Confirmar revisão da contagem'}</button>
        <button type="button" className="theme-toggle" onClick={event=>{const summary=event.currentTarget.closest('details')?.querySelector('summary');setEditing(null);summary?.focus()}}>Fechar revisão</button>
      </fieldset>
      {error&&<p role="alert">{error}</p>}
    </form>}
    {!canReview&&!review&&<p>Aguardando revisão pelo Administrador da apresentação.</p>}
  </section>
}
