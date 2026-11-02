import {useEffect,useRef,useState,useSyncExternalStore} from 'react'
import {ShelfCount} from './ShelfCount'
import {parseShelfCount,countSummary,type ShelfCount as Draft} from '../lib/shelf-count'
import {readShelfCountRaw,saveShelfCount,subscribeShelfCount} from '../lib/shelf-count-store'
import {loadPresentationCounts,submitCountPayload} from '../lib/presentation-counts-api'
import {countSubmission,countFingerprint,type SharedCount} from '../lib/presentation-counts'
import {INVENTORY_CHANGE_EVENT} from '../lib/resume-refresh'
import {loadPublishedPresentation} from '../lib/presentation-cloud'
import type {PresentationBundle} from '../lib/presentation-bundle'
import './PresentationShelfCounts.css'
import {PresentationCountReview} from './PresentationCountReview'
import {loadCountReviews} from '../lib/presentation-count-reviews-api'
import {mergeCountReviews,reviewLabels,type CountReview} from '../lib/presentation-count-reviews'
import {beginPresentationRecount,mergeRecountLinks,type RecountLink} from '../lib/presentation-recounts'
import {loadRecountLinks,loadRelatedCount} from '../lib/presentation-recounts-api'
import {SharedCountMap} from './SharedCountMap'
import {RecurringDivergences} from './RecurringDivergences'
import {bahiaDay,sharedDivergenceChecks} from '../lib/shared-divergence-checks'
import {SharedCountPending} from './SharedCountPending'
const date=(value:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(value))

function SendCount({draft,ready,onBusy,onSaved,receipt}:{draft:Draft;ready:boolean;onBusy:(busy:boolean)=>void;onSaved:(count:SharedCount)=>void;receipt:SharedCount|undefined}){
  const[confirmation,setConfirmation]=useState(''),[error,setError]=useState('')
  const busy=useRef(false),alive=useRef(true)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  let fingerprint='',invalid=''
  try{fingerprint=countFingerprint(countSubmission(draft))}catch(caught){invalid=caught instanceof Error?caught.message:'Contagem incompleta.'}
  const sent=receipt&&countFingerprint(receipt.submission)===fingerprint,conflict=Boolean(receipt&&!sent)
  return <form aria-label="Enviar contagem compartilhada" onSubmit={async event=>{
    event.preventDefault();if(busy.current||!ready||invalid||confirmation!==fingerprint||sent||conflict)return
    if(!navigator.onLine){setError('Conecte antes de enviar. O rascunho continua neste aparelho.');return}
    // Congela exatamente os valores confirmados, sem escrever nem remover o rascunho local.
    const payload=countSubmission(draft)
    busy.current=true;onBusy(true);setError('')
    try{const saved=await submitCountPayload(payload);if(alive.current)onSaved(saved)}
    catch(caught){if(alive.current)setError(caught instanceof Error?caught.message:'Não foi possível confirmar o envio.')}
    finally{busy.current=false;onBusy(false)}
  }}>
    <h3>Enviar contagem de {draft.location}</h3>
    {draft.recountOf&&<p>Recontagem vinculada à contagem de origem: {draft.recountOf}. Este envio não substitui os valores anteriores.</p>}
    <p>Uma cópia completa será registrada com sua conta e a data do servidor. O envio aguarda revisão e não altera caixas, reservas ou conferências aprovadas.</p>
    {invalid&&<p role="status">{invalid}</p>}
    {sent&&<p role="status">Envio já confirmado: {receipt.id}. O rascunho local foi preservado.</p>}
    {conflict&&<p role="alert">Esta contagem já tem um envio com outros valores. Preserve o rascunho para revisão; uma recontagem precisa ser iniciada como outra contagem.</p>}
    {!ready&&<p role="status">Carregue o cenário compartilhado antes de enviar.</p>}
    <label><input type="checkbox" checked={Boolean(fingerprint)&&confirmation===fingerprint} disabled={Boolean(invalid)||sent||conflict} onChange={event=>setConfirmation(event.target.checked?fingerprint:'')}/>Conferi os valores desta contagem e quero enviá-los para revisão.</label>
    <button type="submit" className="theme-toggle" disabled={!ready||Boolean(invalid)||!fingerprint||confirmation!==fingerprint||sent||conflict}>Enviar contagem para revisão</button>
    {error&&<p role="alert">{error}</p>}
  </form>
}
export function PresentationShelfCounts({userId,canOperate,canReview=false,ready,data}:{userId:string;canOperate:boolean;canReview?:boolean;ready:boolean;data:PresentationBundle}){
  const[rows,setRows]=useState<SharedCount[]|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[sending,setSending]=useState(false)
  const[recurrenceDay,setRecurrenceDay]=useState(()=>bahiaDay(new Date().toISOString()))
  const[historyLimit,setHistoryLimit]=useState(50),[confirmedLimit,setConfirmedLimit]=useState(0),[hasMore,setHasMore]=useState(false),[historyBusy,setHistoryBusy]=useState(false)
  const[consultedAt,setConsultedAt]=useState(()=>new Date().toISOString()),refresh=useRef(()=>{})
  const[reviews,setReviews]=useState<Record<string,CountReview>>({}),reviewCache=useRef<Record<string,CountReview>>({})
  const[links,setLinks]=useState<RecountLink[]>([]),linkCache=useRef<RecountLink[]>([]),extraCounts=useRef(new Map<string,SharedCount>()),focusTarget=useRef(''),followSequence=useRef(0),alive=useRef(true)
  const raw=useSyncExternalStore(subscribeShelfCount,()=>readShelfCountRaw(userId),()=>null)
  let draft:Draft|null=null
  try{draft=parseShelfCount(raw,userId)}catch{/* O editor existente mostra o erro e preserva os dados. */}
  useEffect(()=>{
    alive.current=true
    let live=true,sequence=0,pending=false,queued=false,controller:AbortController|undefined,timeout:number|undefined,noticeTimer:number|undefined
    const read=async():Promise<void>=>{
      if(pending){queued=true;return}
      pending=true
      const request=++sequence;controller?.abort();window.clearTimeout(timeout)
      const current=new AbortController();controller=current;timeout=window.setTimeout(()=>current.abort(),15000)
      try{
        const recent=await loadPresentationCounts(current.signal,historyLimit),result=[...recent,...[...extraCounts.current.values()].filter(count=>!recent.some(row=>row.id===count.id))]
        const [decisions,origins]=await Promise.all([loadCountReviews(result,current.signal),loadRecountLinks(result,current.signal)])
        if(live&&request===sequence){const merged=mergeCountReviews(reviewCache.current,decisions,result),mergedLinks=mergeRecountLinks(linkCache.current,origins,result);reviewCache.current=merged;linkCache.current=mergedLinks;setLinks(mergedLinks);setReviews(merged);setRows(result);setRecurrenceDay(bahiaDay(new Date().toISOString()));setConfirmedLimit(historyLimit);setHasMore(recent.length===historyLimit);setError('')}
      }
      catch{if(live&&request===sequence)setError('Não foi possível atualizar as contagens compartilhadas. Os registros já consultados foram mantidos; confira sua conexão e seu acesso.')}
      finally{pending=false;if(live&&request===sequence)setHistoryBusy(false);if(live&&queued){queued=false;void read()}}
    }
    const resume=()=>{void read()},notice=()=>{if(navigator.onLine&&document.visibilityState==='visible'){window.clearTimeout(noticeTimer);noticeTimer=window.setTimeout(resume,150)}}
    refresh.current=resume;void read()
    const interval=window.setInterval(()=>{if(navigator.onLine&&document.visibilityState==='visible')void read()},10000)
    window.addEventListener('focus',resume);window.addEventListener('online',resume);window.addEventListener(INVENTORY_CHANGE_EVENT,notice)
    return()=>{live=false;alive.current=false;controller?.abort();window.clearTimeout(timeout);window.clearTimeout(noticeTimer);window.clearInterval(interval);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener(INVENTORY_CHANGE_EVENT,notice)}
  },[historyLimit])
  function focusCount(id:string){const details=document.getElementById(`presentation-count-${id}`)?.querySelector<HTMLDetailsElement>('details');if(!details)return false;details.open=true;details.querySelector('summary')?.focus();details.scrollIntoView({block:'nearest'});return true}
  useEffect(()=>{if(!focusTarget.current)return;const frame=requestAnimationFrame(()=>{if(focusCount(focusTarget.current))focusTarget.current=''});return()=>cancelAnimationFrame(frame)},[rows])
  async function follow(id:string){
    const request=++followSequence.current
    if(focusCount(id))return
    try{const count=await loadRelatedCount(id,AbortSignal.timeout(15000));if(alive.current&&request===followSequence.current){extraCounts.current.set(id,count);focusTarget.current=id;refresh.current()}}
    catch(caught){if(alive.current&&request===followSequence.current)setError(caught instanceof Error?caught.message:'Não foi possível consultar o vínculo.')}
  }
  const catalog=Object.fromEntries(data.stock.map(row=>[row.code,{application:row.code.startsWith('M')?'Mola':'Amortecedor',defaultLocation:row.location}]))
  const receipt=draft?rows?.find(row=>row.source_id===draft!.id&&row.actor_id===userId.replace(/^presentation:/,'')):undefined
  return <section className="inventory-panel presentation-counts" aria-label="Contagens compartilhadas">
    <h2>Conferência de prateleiras</h2><p>Referência da apresentação: Norte, Sul, Leste e Oeste. O Administrador pode aprovar uma contagem ou solicitar recontagem, com justificativa. As decisões ficam separadas do estoque operacional e não ajustam saldos.</p>
    {message&&<p role="status">{message}</p>}
    {rows!==null&&<SharedCountPending counts={rows} reviews={reviews} links={links} canReview={canReview} canOperate={canOperate} stale={Boolean(error)} onOpen={id=>{focusCount(id)}}/>}
    {canOperate?<fieldset className="presentation-count-session" disabled={sending}><legend>Preparar e enviar contagem</legend>
      <ShelfCount userId={userId} stock={data.stock} catalog={catalog} locations={data.locations} consultedAt={consultedAt} presentationSharing onRefresh={async()=>{await loadPublishedPresentation(AbortSignal.timeout(15000));setConsultedAt(new Date().toISOString())}}/>
      {draft&&<SendCount key={draft.id} draft={draft} ready={ready&&!error} onBusy={setSending} receipt={receipt} onSaved={saved=>{
        setRows(previous=>[saved,...(previous??[]).filter(row=>row.id!==saved.id)].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,historyLimit))
        setMessage(`Envio confirmado: ${saved.id}. Consulte a decisão no histórico; nenhum saldo foi alterado.`);refresh.current()
      }}/>} {sending&&<p role="status">Confirmando envio… Mantenha esta tela aberta.</p>}
    </fieldset>:<p>Perfil de consulta: acompanhe os envios. Administrador e Estoquista podem preparar contagens.</p>}
    {rows!==null&&<SharedCountMap counts={rows} reviews={reviews} userId={userId} onHistory={id=>{focusCount(id)}} stale={Boolean(error)}/>}
    {rows!==null&&<RecurringDivergences userId={userId} canEdit={canReview} checks={sharedDivergenceChecks(rows,reviews)} reference={recurrenceDay} shared stale={Boolean(error)} onEvidence={id=>{focusCount(id)}}/>}
    <h3>Histórico de envios e decisões</h3><p>Começa pelos 50 envios mais recentes. Carregue os anteriores para ampliar também o mapa, as pendências e a recorrência desta consulta. As aprovações valem somente para a apresentação; não autorizam ajustes nem comprovam conferência física real.</p>
    {hasMore&&<button type="button" className="theme-toggle" disabled={historyBusy} onClick={()=>{setHistoryBusy(true);if(confirmedLimit<historyLimit)refresh.current();else setHistoryLimit(value=>value+50)}}>{historyBusy?'Consultando envios anteriores…':'Carregar mais 50 envios anteriores'}</button>}
    {rows!==null&&<p role="status">{rows.length} envios carregados nesta consulta, incluindo vínculos abertos.</p>}
    <button type="button" className="theme-toggle" onClick={()=>refresh.current()}>Atualizar contagens compartilhadas</button>
    {error&&<p role="alert">{error}</p>}{rows===null&&!error&&<p role="status">Consultando contagens…</p>}
    {rows?.length===0&&<p>Nenhuma contagem enviada nesta apresentação.</p>}
    <ul>{rows?.map(row=>{
      const summary=countSummary({rows:row.submission.rows} as Draft)
      const review=reviews[row.id]
      const parentId=row.submission.recount_of,child=links.find(link=>link.parent_count_id===row.id)
      return <li key={row.id} id={`presentation-count-${row.id}`}><details><summary>{row.location} · {parentId?'Recontagem · ':''}{review?reviewLabels[review.decision]:'Aguardando revisão'} · {date(row.created_at)}</summary>
        <p>Responsável no envio: {row.actor_name}. Identificador: {row.id}.</p>
        {parentId&&<p>Origem desta recontagem: {parentId}. <button type="button" className="theme-toggle" onClick={()=>void follow(parentId)}>Ver contagem de origem</button></p>}
        {child&&<p>Recontagem registrada: {child.child_count_id}. <button type="button" className="theme-toggle" onClick={()=>void follow(child.child_count_id)}>Ver recontagem</button></p>}
        <p>{summary.differences} itens divergentes; faltam {summary.missing} caixas e sobram {summary.extra} caixas em relação à referência.</p>
        <p>Consulta de referência: {date(row.submission.consulted_at)}. Início informado: {date(row.submission.started_at)}.</p>
        <ul>{row.submission.rows.map(item=><li key={`${item.code}:${item.status}`}>{item.code} · {item.status}: esperado {item.expected}, contado {item.counted}; diferença {item.counted!-item.expected} caixas.</li>)}</ul>
        {!row.submission.rows.length&&<p>Prateleira sem caixas na referência e na contagem enviada.</p>}
        {row.submission.notes&&<p>Observação: {row.submission.notes}</p>}
        <PresentationCountReview count={row} review={review} canReview={canReview} ready={ready&&!error} onReviewed={(decision,count)=>{
          const merged=mergeCountReviews(reviewCache.current,[decision],[...(rows??[]).filter(row=>row.id!==count.id),count])
          reviewCache.current=merged;setReviews(merged);setMessage(`Revisão confirmada: ${decision.id}. ${reviewLabels[decision.decision]}; nenhum saldo foi alterado.`);refresh.current()
        }}/>
        {canOperate&&review?.decision==='recount_requested'&&!child&&<button type="button" className="theme-toggle" disabled={!ready||Boolean(error)||sending} onClick={()=>{
          try{
            if(!navigator.onLine)throw Error('Conecte antes de iniciar a recontagem.')
            const next=beginPresentationRecount(userId,row,review,draft,new Date().toISOString())
            saveShelfCount(userId,next,raw);setMessage(`Recontagem de ${row.location} iniciada, vinculada a ${row.id}. Preencha novamente as quantidades no editor; nenhum saldo foi alterado.`)
            const editor=document.getElementById('shelf-count') as HTMLDetailsElement|null;if(editor){editor.open=true;editor.querySelector('summary')?.focus();editor.scrollIntoView({block:'nearest'})}
          }catch(caught){setMessage(caught instanceof Error?caught.message:'Não foi possível iniciar a recontagem.')}
        }}>Iniciar recontagem de {row.location}</button>}
      </details></li>
    })}</ul>
  </section>
}
