import {useEffect,useRef,useState} from 'react'
import {ShelfCapacity} from './ShelfCapacity'
import {loadSharedLayout,saveSharedLayout} from '../lib/shared-layout-api'
import {newestSharedLayout,validateSharedDraft,type SharedLayout,type SharedLayoutDraft} from '../lib/shared-layout'
import type {PresentationBundle} from '../lib/presentation-bundle'
import './SharedShelfLayout.css'
import {INVENTORY_CHANGE_EVENT} from '../lib/resume-refresh'

function RackFields({snapshot,location,onSave,onClose}:{snapshot:SharedLayout;location:string;onSave:(draft:SharedLayoutDraft)=>Promise<void>;onClose:()=>void}){
  const original=snapshot.layout[location as keyof typeof snapshot.layout],capacity=snapshot.capacities[location]
  const[x,setX]=useState(String(original.x)),[y,setY]=useState(String(original.y)),[width,setWidth]=useState(String(original.width)),[height,setHeight]=useState(String(original.height))
  const[boxes,setBoxes]=useState(capacity?String(capacity.boxes):''),[basis,setBasis]=useState(capacity?.basis??'')
  const[error,setError]=useState(''),[pending,setPending]=useState(false),busy=useRef(false)
  return <form aria-label="Editar configuração compartilhada" onSubmit={async event=>{
    event.preventDefault();if(busy.current)return
    busy.current=true;setPending(true);setError('')
    try{
      const draft:SharedLayoutDraft={revision:snapshot.revision,layout:structuredClone(snapshot.layout),capacities:structuredClone(snapshot.capacities)}
      draft.layout[location as keyof typeof draft.layout]={x:Number(x),y:Number(y),width:Number(width),height:Number(height)}
      if(boxes==='')delete draft.capacities[location];else draft.capacities[location]={boxes:Number(boxes),basis:basis.trim()}
      await onSave(validateSharedDraft(draft))
    }catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível confirmar a gravação. Seu preenchimento foi mantido.')}
    finally{busy.current=false;setPending(false)}
  }}>
    <p>Editando {location} a partir da versão {snapshot.revision}. Nenhum saldo será movimentado. Deixe a capacidade vazia para remover a referência desta prateleira.</p>
    <fieldset disabled={pending}><legend>Posição e capacidade de {location}</legend>
      <div className="shared-layout-fields">
        <label>Coluna compartilhada<input type="number" min={0} max={42} step={1} required value={x} onChange={event=>setX(event.target.value)}/></label>
        <label>Linha compartilhada<input type="number" min={0} max={27} step={1} required value={y} onChange={event=>setY(event.target.value)}/></label>
        <label>Largura compartilhada<input type="number" min={6} max={48} step={1} required value={width} onChange={event=>setWidth(event.target.value)}/></label>
        <label>Altura compartilhada<input type="number" min={5} max={32} step={1} required value={height} onChange={event=>setHeight(event.target.value)}/></label>
        <label>Capacidade compartilhada (caixas)<input type="number" min={1} max={2147483647} step={1} value={boxes} onChange={event=>setBoxes(event.target.value)}/></label>
        <label>Referência compartilhada da caixa<input required={boxes!==''} maxLength={120} value={basis} onChange={event=>setBasis(event.target.value)}/></label>
      </div>
      <div className="shared-layout-actions"><button className="theme-toggle" type="submit">{pending?'Confirmando gravação…':'Salvar planta e capacidades no Supabase'}</button><button className="theme-toggle" type="button" onClick={onClose}>Fechar edição compartilhada</button></div>
    </fieldset>
    {error&&<p role="alert">{error}</p>}
  </form>
}
function SharedEditor({snapshot,onSave,onClose,saving}:{snapshot:SharedLayout;onSave:(draft:SharedLayoutDraft)=>Promise<void>;onClose:()=>void;saving:boolean}){
  const[location,setLocation]=useState('NORTE')
  return <section aria-label="Edição compartilhada"><h3>Editar planta e capacidades compartilhadas</h3>
    <p>A edição usa uma cópia da versão {snapshot.revision}. Se outro aparelho salvar antes, o servidor recusará a versão antiga e manterá seu preenchimento.</p>
    <label>Prateleira compartilhada<select disabled={saving} value={location} onChange={event=>setLocation(event.target.value)}>{['NORTE','SUL','LESTE','OESTE'].map(code=><option key={code}>{code}</option>)}</select></label>
    <RackFields key={location} snapshot={snapshot} location={location} onSave={onSave} onClose={onClose}/>
  </section>
}
export function SharedShelfLayout({userId,canEdit,data}:{userId:string;canEdit:boolean;data:PresentationBundle}){
  const[state,setState]=useState<{snapshot:SharedLayout|null;error:string}>({snapshot:null,error:''})
  const[mode,setMode]=useState('shared'),[editing,setEditing]=useState<SharedLayout|null>(null),[message,setMessage]=useState('')
  const refresh=useRef<()=>void>(()=>{}),active=useRef(true)
  const[saving,setSaving]=useState(false),writeBusy=useRef(false)
  const attempt=useRef<{fingerprint:string;id:string}|null>(null)
  useEffect(()=>{
    active.current=true;let live=true,sequence=0,controller:AbortController|null=null,timeout:number|undefined,noticeTimer:number|undefined
    const read=async()=>{
      const request=++sequence;controller?.abort();window.clearTimeout(timeout)
      controller=new AbortController();timeout=window.setTimeout(()=>controller?.abort(),15000)
      try{const snapshot=await loadSharedLayout(controller.signal);if(live&&request===sequence)setState(previous=>({snapshot:newestSharedLayout(previous.snapshot,snapshot),error:''}))}
      catch{if(live&&request===sequence)setState(previous=>({...previous,error:'Não foi possível atualizar a configuração compartilhada. A última versão consultada foi mantida; novas edições estão bloqueadas até reconectar.'}))}
    }
    refresh.current=()=>{void read()};void read()
    const interval=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void read()},10000)
    const resume=()=>{void read()}
    const notice=()=>{if(document.visibilityState!=='visible'||!navigator.onLine)return;window.clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>{void read()},150)}
    window.addEventListener('focus',resume);window.addEventListener('online',resume)
    window.addEventListener(INVENTORY_CHANGE_EVENT,notice)
    return()=>{live=false;active.current=false;controller?.abort();window.clearTimeout(timeout);window.clearTimeout(noticeTimer);window.clearInterval(interval);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener(INVENTORY_CHANGE_EVENT,notice)}
  },[])
  const shared=mode==='shared'
  const display=shared&&state.snapshot?{...data,floorPlan:state.snapshot.layout,capacities:state.snapshot.capacities}:data
  return <>
    <section className="inventory-panel dashboard-panel shared-shelf-layout" aria-label="Sincronização da planta e capacidades">
      <h2>Planta e capacidades entre aparelhos</h2>
      <p>A configuração compartilhada recebe avisos privados para consultar novas versões, com verificação adicional a cada 10 segundos, ao voltar à janela e ao reconectar. Salvar é permitido ao Administrador e exige a versão consultada. Os dados continuam sendo os da apresentação.</p>
      <label>Configuração exibida<select disabled={canEdit&&Boolean(editing)} value={mode} onChange={event=>setMode(event.target.value)}><option value="shared">Compartilhada no Supabase</option><option value="local">Configurações deste navegador</option></select></label>
      <p>As cópias locais existentes são preservadas e podem ser vistas nessa seleção. Elas não substituem a configuração compartilhada automaticamente.</p>
      <p role="status">{state.snapshot?`Versão compartilhada ${state.snapshot.revision} · Atualizada em ${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(state.snapshot.updatedAt))} (America/Bahia).`:state.error?'Sem configuração compartilhada disponível; exibindo a referência da apresentação.':'Consultando planta e capacidades compartilhadas…'}</p>
      {state.error&&<p role="alert">{state.error}</p>}{message&&<p role="status">{message}</p>}
      <div className="shared-layout-actions"><button className="theme-toggle" type="button" onClick={()=>refresh.current()}>Atualizar planta e capacidades</button>
        {shared&&canEdit&&!editing&&<button className="theme-toggle" type="button" disabled={!state.snapshot||Boolean(state.error)} onClick={()=>{if(state.snapshot){attempt.current=null;setEditing(structuredClone(state.snapshot));setMessage('')}}}>Editar configuração compartilhada</button>}
      </div>
      {!canEdit&&<p>Perfil de consulta: a configuração compartilhada é alterada pelo Administrador.</p>}
      {shared&&canEdit&&editing&&<SharedEditor snapshot={editing} saving={saving} onClose={()=>setEditing(null)} onSave={async draft=>{
        if(writeBusy.current)throw Error('Aguarde a confirmação da gravação em andamento.')
        writeBusy.current=true;setSaving(true)
        try{
        const fingerprint=JSON.stringify(draft)
        if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()}
        const saved=await saveSharedLayout(draft,attempt.current.id)
        if(active.current){setState(previous=>({snapshot:newestSharedLayout(previous.snapshot,saved),error:''}));setEditing(null);setMessage(`Gravação confirmada no Supabase, versão ${saved.revision}. A mesma confirmação não será aplicada duas vezes.`);refresh.current()}
        }finally{writeBusy.current=false;if(active.current)setSaving(false)}
      }}/>} 
    </section>
    <ShelfCapacity userId={userId} locations={data.locations} stock={data.stock} canEdit={shared?false:canEdit} demoOnly presentationData={display} sharedView={shared}/>
  </>
}
