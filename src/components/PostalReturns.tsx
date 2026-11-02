import {useRef,useState,useSyncExternalStore} from 'react'
import {parsePostalReturns,postalConditionLabels,readPostalReturnsRaw,receivePostalReturn,samplePostalReturns,savePostalReturns,subscribePostalReturns,type PostalCondition,type PostalReturnState} from '../lib/postal-returns'
import './PostalReturns.css'

function ReceiptForm({expected,onSave}:{expected:number;onSave:(counted:number,condition:PostalCondition,notes:string,confirmed:boolean)=>void}){
  const[counted,setCounted]=useState(''),[condition,setCondition]=useState<PostalCondition>('intact'),[notes,setNotes]=useState(''),[confirmed,setConfirmed]=useState(false)
  return <form aria-label="Conferência do retorno dos Correios" onSubmit={event=>{event.preventDefault();onSave(Number(counted),condition,notes,confirmed)}}>
    <label>Caixas recebidas neste retorno<input type="number" min={0} max={expected} step={1} required value={counted} onChange={event=>setCounted(event.target.value)}/></label>
    <p>De 0 a {expected} caixas no cenário. Zero registra volume sem as caixas esperadas e exige divergência ou avaria.</p>
    <label>Condição do retorno<select value={condition} onChange={event=>setCondition(event.target.value as PostalCondition)}>{Object.entries(postalConditionLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Observação da conferência<textarea minLength={5} maxLength={500} required value={notes} onChange={event=>setNotes(event.target.value)}/></label>
    <label className="postal-receipt-check"><input type="checkbox" required checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>Conferi o volume retornado e a quantidade informada.</label>
    <button type="submit" className="theme-toggle">Registrar retorno para avaliação</button>
  </form>
}
export function PostalReturns({userId,canOperate,sources=samplePostalReturns}:{userId:string;canOperate:boolean;sources?:typeof samplePostalReturns}){
  const raw=useSyncExternalStore(subscribePostalReturns,()=>readPostalReturnsRaw(userId),()=>null)
  const[id,setId]=useState(sources[0].id),[message,setMessage]=useState({text:'',error:false}),busy=useRef(false)
  let state:PostalReturnState|null=null,error=''
  try{state=parsePostalReturns(raw,userId)}catch{error='Não foi possível recuperar os retornos locais. Dados preservados; recebimento bloqueado até revisão.'}
  const source=sources.find(row=>row.id===id)!,receipt=state&&Object.hasOwn(state.receipts,id)?state.receipts[id]:null
  const entries=state?Object.values(state.receipts):[]
  return <section className="inventory-panel dashboard-panel postal-returns" aria-label="Retornos dos Correios">
    <h2>Retornos dos Correios</h2>
    <p>Conferência de recebimento na apresentação, separada de Garantia e devolução de cliente. Cada remessa pode ser registrada uma vez neste navegador e conta.</p>
    <p>O retorno fica aguardando decisão de destino. Não libera caixas para venda, não desfaz expedição e não aumenta o estoque de 85 caixas do cenário.</p>
    {error&&<p role="alert">{error}</p>}{message.text&&<p role={message.error?'alert':'status'}>{message.text}</p>}
    {state&&<p role="status">{entries.length} {entries.length===1?'retorno aguardando':'retornos aguardando'} decisão de destino · {entries.reduce((total,row)=>total+row.counted,0)} caixas recebidas para avaliação.</p>}
    <label>Retorno para conferir<select value={id} onChange={event=>{setId(event.target.value);setMessage({text:'',error:false})}}>{sources.map(row=><option key={row.id} value={row.id}>{row.id} — {row.customer}</option>)}</select></label>
    <p>{source.shipment} · {source.customer} · {source.code} · {source.expected} caixas esperadas.</p>
    {receipt?<section aria-label="Registro do retorno"><h3>Aguardando decisão de destino</h3>
      <p>{receipt.counted} de {source.expected} caixas recebidas · {postalConditionLabels[receipt.condition]}</p><p>Observação: {receipt.notes}</p>
      <p>Conferência declarada em {new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(receipt.recordedAt))} (America/Bahia).</p>
      <p>Registro local preservado. A condição informada não equivale a aprovação de testagem ou entrada no estoque.</p>
    </section>:state&&canOperate?<ReceiptForm key={id} expected={source.expected} onSave={(counted,condition,notes,confirmed)=>{
      if(!state||busy.current)return
      busy.current=true
      try{savePostalReturns(receivePostalReturn(state,id,counted,condition,notes,confirmed),raw);setMessage({text:'Retorno registrado para avaliação neste navegador. Nenhum saldo foi alterado.',error:false})}
      catch(caught){setMessage({text:caught instanceof Error?caught.message:'Não foi possível salvar o retorno.',error:true})}
      finally{busy.current=false}
    }}/>:!canOperate&&<p>Perfil de consulta: o registro nesta apresentação é feito pelo Administrador ou Estoquista.</p>}
  </section>
}
