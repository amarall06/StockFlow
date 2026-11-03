import{useEffect,useRef,useState}from'react'
import{RecurringDivergences,type RecurringDivergencesProps}from'./RecurringDivergences'
import{loadSharedRecurrence,newestRecurrence,saveSharedRecurrence,type SharedRecurrence}from'../lib/shared-recurrence-api'
import{validateRecurrenceRule,type RecurrenceRule}from'../lib/recurring-divergences'
import{startResumeRefresh}from'../lib/resume-refresh'
import{Button}from'./Interface'
function Editor({snapshot,onSave,onClose}:{snapshot:SharedRecurrence;onSave:(rule:RecurrenceRule)=>Promise<void>;onClose:()=>void}){
 const[occurrences,setOccurrences]=useState(String(snapshot.rule.occurrences)),[days,setDays]=useState(String(snapshot.rule.days)),[saving,setSaving]=useState(false),[error,setError]=useState(''),busy=useRef(false)
 return <form className="shared-recurrence-editor" aria-label="Editar regra compartilhada de recorrência" onSubmit={async event=>{
  event.preventDefault();if(busy.current)return;busy.current=true;setSaving(true);setError('')
  try{await onSave(validateRecurrenceRule({occurrences:Number(occurrences),days:Number(days)}))}catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível confirmar a gravação.')}finally{busy.current=false;setSaving(false)}
 }}><fieldset disabled={saving}><legend>Editar a partir da versão {snapshot.revision}</legend><label>Mínimo compartilhado de conferências<input type="number" min={2} max={100} step={1} required value={occurrences} onChange={event=>setOccurrences(event.target.value)}/></label><label>Período compartilhado (dias corridos)<input type="number" min={1} max={3650} step={1} required value={days} onChange={event=>setDays(event.target.value)}/></label><div className="shared-recurrence-actions"><Button variant="primary" type="submit">{saving?'Confirmando…':'Salvar regra entre aparelhos'}</Button><Button onClick={onClose}>Fechar edição da regra</Button></div></fieldset>{error&&<p role="alert">{error}</p>}</form>
}
export function SharedRecurrence(props:Omit<RecurringDivergencesProps,'configuration'>){
 const[mode,setMode]=useState('shared'),[state,setState]=useState<{snapshot:SharedRecurrence|null;error:string}>({snapshot:null,error:''}),[editing,setEditing]=useState<SharedRecurrence|null>(null),[message,setMessage]=useState('')
 const interaction=useRef(false),refresh=useRef(()=>{}),active=useRef(true),attempt=useRef<{fingerprint:string;id:string}|null>(null)
 useEffect(()=>{
  active.current=true;if(mode!=='shared')return
  let live=true,initial=true
  const apply=(next:SharedRecurrence)=>{if(live)setState(previous=>{try{return{snapshot:newestRecurrence(previous.snapshot,next),error:''}}catch{return{...previous,error:'A versão recebida está inconsistente. Última regra preservada; atualize antes de editar.'}}})}
  const fail=()=>{if(live)setState(previous=>({...previous,error:'Não foi possível atualizar a regra compartilhada. A última regra consultada foi preservada; novas edições estão bloqueadas até atualizar.'}))}
  refresh.current=()=>{void loadSharedRecurrence().then(apply).catch(fail)}
  void loadSharedRecurrence().then(apply).catch(fail).finally(()=>{initial=false})
  const stop=startResumeRefresh({load:loadSharedRecurrence,apply,onError:fail,intervalMs:30000,canRefresh:()=>!initial&&!interaction.current&&!document.querySelector('dialog[open]')})
  return()=>{live=false;active.current=false;stop()}
 },[mode,props.userId])
 return <div className="shared-recurrence"><label>Origem da regra de recorrência<select value={mode} disabled={Boolean(editing)} onChange={event=>setMode(event.target.value)}><option value="shared">Compartilhada entre aparelhos</option><option value="local">Regra anterior deste navegador</option></select></label>{mode==='local'?<RecurringDivergences {...props}/>:<RecurringDivergences {...props} configuration={{rule:state.snapshot?.rule??null,error:state.error,footer:<>
  <p>{state.snapshot?`Regra compartilhada · versão ${state.snapshot.revision} · ${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(state.snapshot.updatedAt))}`:'Consultando regra compartilhada…'}</p><p>Atualização por avisos de mudança, a cada 30 segundos e ao reconectar. A configuração anterior do navegador permanece separada e não é importada automaticamente.</p>
  <div className="shared-recurrence-actions"><Button disabled={Boolean(editing)} onClick={()=>refresh.current()}>Atualizar regra compartilhada</Button>{props.canEdit&&!editing&&<Button disabled={!state.snapshot||Boolean(state.error)} onClick={()=>{interaction.current=true;attempt.current=null;setEditing(state.snapshot);setMessage('')}}>Editar regra compartilhada</Button>}</div>
  {!props.canEdit&&<p>Somente Administrador pode alterar a regra compartilhada.</p>}{message&&<p role="status">{message}</p>}
  {editing&&<Editor snapshot={editing} onClose={()=>{interaction.current=false;setEditing(null);refresh.current()}} onSave={async rule=>{
   const fingerprint=JSON.stringify([editing.revision,rule]);if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()}
   const saved=await saveSharedRecurrence(editing,rule,attempt.current.id)
   if(active.current){setState(previous=>({snapshot:newestRecurrence(previous.snapshot,saved),error:''}));interaction.current=false;setEditing(null);setMessage('Regra confirmada. Consultando a versão compartilhada atual, sem alterar estoque.');refresh.current()}
  }}/>}</>}}/>}</div>
}
