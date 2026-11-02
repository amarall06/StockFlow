import {useEffect,useRef,useState,useSyncExternalStore} from 'react'
import {ShelfCount} from './ShelfCount'
import {parseShelfCount,countSummary,type ShelfCount as Draft} from '../lib/shelf-count'
import {readShelfCountRaw,subscribeShelfCount} from '../lib/shelf-count-store'
import {loadPresentationCounts,submitCountPayload} from '../lib/presentation-counts-api'
import {countSubmission,countFingerprint,type SharedCount} from '../lib/presentation-counts'
import {INVENTORY_CHANGE_EVENT} from '../lib/resume-refresh'
import {loadPublishedPresentation} from '../lib/presentation-cloud'
import type {PresentationBundle} from '../lib/presentation-bundle'
import './PresentationShelfCounts.css'
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
export function PresentationShelfCounts({userId,canOperate,ready,data}:{userId:string;canOperate:boolean;ready:boolean;data:PresentationBundle}){
  const[rows,setRows]=useState<SharedCount[]|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[sending,setSending]=useState(false)
  const[consultedAt,setConsultedAt]=useState(()=>new Date().toISOString()),refresh=useRef(()=>{})
  const raw=useSyncExternalStore(subscribeShelfCount,()=>readShelfCountRaw(userId),()=>null)
  let draft:Draft|null=null
  try{draft=parseShelfCount(raw,userId)}catch{/* O editor existente mostra o erro e preserva os dados. */}
  useEffect(()=>{
    let live=true,sequence=0,controller:AbortController|undefined,timeout:number|undefined,noticeTimer:number|undefined
    const read=async()=>{
      const request=++sequence;controller?.abort();window.clearTimeout(timeout)
      const current=new AbortController();controller=current;timeout=window.setTimeout(()=>current.abort(),15000)
      try{const result=await loadPresentationCounts(current.signal);if(live&&request===sequence){setRows(result);setError('')}}
      catch{if(live&&request===sequence)setError('Não foi possível atualizar as contagens compartilhadas. Os registros já consultados foram mantidos; confira sua conexão e seu acesso.')}
    }
    const resume=()=>{void read()},notice=()=>{if(navigator.onLine&&document.visibilityState==='visible'){window.clearTimeout(noticeTimer);noticeTimer=window.setTimeout(resume,150)}}
    refresh.current=resume;void read()
    const interval=window.setInterval(()=>{if(navigator.onLine&&document.visibilityState==='visible')void read()},10000)
    window.addEventListener('focus',resume);window.addEventListener('online',resume);window.addEventListener(INVENTORY_CHANGE_EVENT,notice)
    return()=>{live=false;controller?.abort();window.clearTimeout(timeout);window.clearTimeout(noticeTimer);window.clearInterval(interval);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener(INVENTORY_CHANGE_EVENT,notice)}
  },[])
  const catalog=Object.fromEntries(data.stock.map(row=>[row.code,{application:row.code.startsWith('M')?'Mola':'Amortecedor',defaultLocation:row.location}]))
  const receipt=draft?rows?.find(row=>row.source_id===draft!.id&&row.actor_id===userId.replace(/^presentation:/,'')):undefined
  return <section className="inventory-panel presentation-counts" aria-label="Contagens compartilhadas">
    <h2>Conferência de prateleiras</h2><p>Referência da apresentação: Norte, Sul, Leste e Oeste. Envios ficam aguardando revisão, separados do estoque operacional. Aprovação e ajuste não estão disponíveis.</p>
    {message&&<p role="status">{message}</p>}
    {canOperate?<fieldset className="presentation-count-session" disabled={sending}><legend>Preparar e enviar contagem</legend>
      <ShelfCount userId={userId} stock={data.stock} catalog={catalog} locations={data.locations} consultedAt={consultedAt} presentationSharing onRefresh={async()=>{await loadPublishedPresentation(AbortSignal.timeout(15000));setConsultedAt(new Date().toISOString())}}/>
      {draft&&<SendCount key={draft.id} draft={draft} ready={ready&&!error} onBusy={setSending} receipt={receipt} onSaved={saved=>{
        setRows(previous=>[saved,...(previous??[]).filter(row=>row.id!==saved.id)].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,50))
        setMessage(`Envio confirmado: ${saved.id}. Aguardando revisão; nenhum saldo foi alterado.`);refresh.current()
      }}/>} {sending&&<p role="status">Confirmando envio… Mantenha esta tela aberta.</p>}
    </fieldset>:<p>Perfil de consulta: acompanhe os envios. Administrador e Estoquista podem preparar contagens.</p>}
    <h3>Histórico de envios</h3><p>Até 50 envios mais recentes, com consulta automática e ao voltar à janela. São registros aguardando revisão, não conferências aprovadas.</p>
    <button type="button" className="theme-toggle" onClick={()=>refresh.current()}>Atualizar contagens compartilhadas</button>
    {error&&<p role="alert">{error}</p>}{rows===null&&!error&&<p role="status">Consultando contagens…</p>}
    {rows?.length===0&&<p>Nenhuma contagem enviada nesta apresentação.</p>}
    <ul>{rows?.map(row=>{
      const summary=countSummary({rows:row.submission.rows} as Draft)
      return <li key={row.id}><details><summary>{row.location} · Aguardando revisão · {date(row.created_at)}</summary>
        <p>Responsável no envio: {row.actor_name}. Identificador: {row.id}.</p>
        <p>{summary.differences} itens divergentes; faltam {summary.missing} caixas e sobram {summary.extra} caixas em relação à referência.</p>
        <p>Consulta de referência: {date(row.submission.consulted_at)}. Início informado: {date(row.submission.started_at)}.</p>
        <ul>{row.submission.rows.map(item=><li key={`${item.code}:${item.status}`}>{item.code} · {item.status}: esperado {item.expected}, contado {item.counted}; diferença {item.counted!-item.expected} caixas.</li>)}</ul>
        {!row.submission.rows.length&&<p>Prateleira sem caixas na referência e na contagem enviada.</p>}
        {row.submission.notes&&<p>Observação: {row.submission.notes}</p>}
      </details></li>
    })}</ul>
  </section>
}
