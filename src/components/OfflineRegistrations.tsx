import {useCallback,useEffect,useRef,useState} from 'react'
import {createRegistration,findRegistration,readOfflineRegistrations,updateOfflineRegistration,type OfflineRegistration} from '../lib/offline-registrations'
import { INVENTORY_CHANGE_EVENT } from '../lib/resume-refresh'
export function OfflineRegistrations({userId,administrator,onRefresh}:{userId:string;administrator:boolean;onRefresh:()=>Promise<void>}){
  const read=useCallback(()=>{try{return{rows:readOfflineRegistrations(userId),error:''}}catch(error){return{rows:[],error:error instanceof Error?error.message:'Falha ao ler cadastros offline.'}}},[userId])
  const [state,setState]=useState(read),[message,setMessage]=useState(''),[saving,setSaving]=useState(false)
  const busy=useRef(false),active=useRef(true)
  useEffect(()=>{active.current=true;const update=()=>{if(!busy.current)setState(read())};window.addEventListener('storage',update);window.addEventListener('focus',update);return()=>{active.current=false;window.removeEventListener('storage',update);window.removeEventListener('focus',update)}},[userId,read])
  async function send(draft:OfflineRegistration){
    if(!administrator||busy.current)return
    if(!navigator.onLine){setMessage('Reconecte-se antes de conferir o cadastro.');return}
    busy.current=true;setSaving(true);setMessage('')
    try{
      const current=readOfflineRegistrations(userId).find(row=>row.id===draft.id)
      if(!current||JSON.stringify(current)!==JSON.stringify(draft))throw new Error('O cadastro mudou. Reabra o sistema para conferir.')
      if(current.phase!=='confirmed'){
        const found=await findRegistration(current.kind,current.name)
        if(!active.current)return
        if(current.phase==='uncertain'&&!found)throw new Error('A consulta não encontrou o cadastro. Preserve o pedido e confira com o administrador; nenhuma nova criação foi reenviada.')
        if(!window.confirm(`${found?'Usar cadastro já existente':'Criar cadastro preparado offline'}?\n${current.kind==='supplier'?'Fornecedor':'Fabricante'}: ${current.name}\n${found?`Identificador encontrado: ${found.id}`:'O servidor validará nome e permissão.'}`))return
        updateOfflineRegistration(userId,current.id,'uncertain');setState(read())
        const saved=found??await createRegistration(current.kind,current.name)
        updateOfflineRegistration(userId,current.id,'confirmed',saved.id);if(active.current)setState(read())
      }
      const matched=await findRegistration(current.kind,current.name)
      const confirmed=readOfflineRegistrations(userId).find(row=>row.id===current.id)
      if(!matched||matched.id!==confirmed?.serverId)throw new Error('Cadastro confirmado, mas a leitura mudou. Preserve a referência para revisão; não crie novamente.')
      if(!active.current)return
      await onRefresh();updateOfflineRegistration(userId,current.id,null)
      window.dispatchEvent(new Event('liber:offline-catalog'))
      window.dispatchEvent(new Event(INVENTORY_CHANGE_EVENT))
      setState(read());setMessage('Cadastro offline conferido. Atualize a lista do módulo para utilizar a referência.')
    }catch(error){if(active.current){setState(read());setMessage(error instanceof Error?error.message:'Não foi possível conferir o cadastro.')}}
    finally{busy.current=false;if(active.current)setSaving(false)}
  }
  if(!state.rows.length&&!state.error&&!message)return null
  return <section className="inventory-panel" aria-label="Cadastros preparados offline"><h2>Cadastros preparados offline</h2><p role="status">{state.rows.length} cadastros offline aguardam conferência. Confirmação individual por Administrador. Se houver dúvida sobre um envio, a recuperação consulta o nome antes de qualquer nova criação.</p>{state.error&&<p role="alert">{state.error}</p>}{message&&<p role="status">{message}</p>}<ul>{state.rows.map(row=><li key={row.id}>{row.kind==='supplier'?'Fornecedor':'Fabricante'} · {row.name} · referência {row.id} <button type="button" disabled={!administrator||saving} onClick={()=>void send(row)}>{row.phase==='draft'?'Conferir cadastro offline':row.phase==='confirmed'?'Atualizar cadastro confirmado':'Recuperar cadastro pendente'}</button></li>)}</ul></section>
}
