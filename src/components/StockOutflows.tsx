import { useRef, useState, type FormEvent } from 'react'
import type { ProductInfo, StockRow } from '../lib/inventory-api'
import { eligibleOutflows, outflowLabels, registerOutflow, normalizeOutflow, OutflowRejectedError, type OutflowReason } from '../lib/outflow-api'
import { readPendingOutflow, savePendingOutflow, clearPendingOutflow, type PendingOutflow } from '../lib/pending-outflow'
import './StockOutflows.css'

const keyOf=(row:StockRow)=>JSON.stringify([row.code,row.location,row.status])

export function StockOutflows({stock,catalog,ready,isAdministrator,userId,onRefresh}:{
  stock:StockRow[];catalog:Record<string,ProductInfo>;ready:boolean;isAdministrator:boolean;userId:string;onRefresh:()=>Promise<void>
}) {
  const [recovery,setRecovery]=useState(()=>readPendingOutflow(userId))
  const [springs,setSprings]=useState(Boolean(recovery.pending?.input.row.code.startsWith('M')))
  const [reason,setReason]=useState<OutflowReason>(recovery.pending?.input.reason??'sale')
  const [source,setSource]=useState(recovery.pending?keyOf(recovery.pending.input.row):'')
  const [quantity,setQuantity]=useState(String(recovery.pending?.input.boxes??1))
  const [notes,setNotes]=useState(recovery.pending?.input.notes??'')
  const [reference,setReference]=useState(recovery.pending?.input.reference??'')
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const busy=useRef(false)
  const pending=recovery.pending
  const eligible=eligibleOutflows(stock,springs,reason)
  const selected=eligible.find((row)=>keyOf(row)===source)
  const boxes=Number(quantity)
  const after=selected && Number.isInteger(boxes) && boxes>0 && boxes<=selected.boxes ? selected.boxes-boxes : null
  function changed(){if(!pending){setError('');setMessage('')}}
  async function refreshSaved(){
    try{await onRefresh();clearPendingOutflow(userId);setRecovery({pending:null,error:''});setSource('');setQuantity('1');setNotes('');setReference('');setError('');setMessage('Saída registrada. Estoque e histórico atualizados.')}
    catch{setError('Saída já salva. Use Atualizar estoque para consultar o saldo sem retirar novamente.')}
  }
  async function refresh(){
    if(busy.current)return
    busy.current=true;setSaving(true)
    try{if(pending?.phase==='confirmed')await refreshSaved();else{await onRefresh();setError('')}}
    catch{setError('Não foi possível atualizar o estoque. Tente novamente.')}
    finally{busy.current=false;setSaving(false)}
  }
  async function resolvePending(operation:PendingOutflow){
    if(!ready||!isAdministrator||busy.current||recovery.error)return
    busy.current=true
    setSaving(true);setError('');setMessage('')
    try{
      if(operation.phase!=='confirmed'){
        // Usa o conteúdo ORIGINAL, mesmo que a retirada já tenha zerado o saldo atual.
        await registerOutflow(operation.input,operation.requestId)
        const confirmed:PendingOutflow={...operation,phase:'confirmed'}
        setRecovery({pending:confirmed,error:''})
        // Se a gravação da fase falhar, o pedido original continua recuperável pelo UUID.
        try{savePendingOutflow(confirmed)}catch{ /* Reenvio do UUID original é idempotente. */ }
      }
      await refreshSaved()
    }catch(caught){
      if(caught instanceof OutflowRejectedError){
        try{clearPendingOutflow(userId);setRecovery({pending:null,error:''})}catch{ /* Conserva o bloqueio se não conseguir encerrar o pedido. */ }
      }
      setError(caught instanceof Error?caught.message:'Não foi possível confirmar. Confira o pedido pendente antes de registrar outra saída.')
    }
    finally{busy.current=false;setSaving(false)}
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!ready||!isAdministrator||busy.current||recovery.error)return
    if(pending){await resolvePending(pending);return}
    if(!selected){setError('Escolha um saldo de origem disponível.');return}
    try{
      const input={row:{...selected},boxes,reason,notes,reference}
      normalizeOutflow(input)
      const operation:PendingOutflow={version:1,userId,requestId:crypto.randomUUID(),input,phase:'uncertain'}
      // É obrigatório guardar o pedido ANTES de qualquer requisição ao servidor.
      savePendingOutflow(operation)
      setRecovery({pending:operation,error:''})
      await resolvePending(operation)
    }catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível preparar o envio.')}
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">AMORTECEDORES E MOLAS</p><h1>Saídas de estoque</h1><p className="subtitle">Registre a retirada de caixas e acompanhe o motivo no Histórico.</p></div></div>
    <section className="inventory-panel outflow-panel" aria-label="Registrar saída de caixas">
      {!isAdministrator?<p>O registro de saídas está disponível apenas para Administrador nesta etapa.</p>:!ready?<p role="status">O registro de saídas aguarda ativação no banco.</p>:<>
        <div className="outflow-heading"><div><h2>Registrar saída</h2><p>A operação desconta caixas do estoque normal. Transferências e garantia têm controles próprios.</p></div><button type="button" className="theme-toggle" disabled={saving} onClick={()=>void refresh()}>Atualizar estoque</button></div>
        {recovery.error&&<p className="auth-error" role="alert">{recovery.error}</p>}
        {pending&&<section className="outflow-summary" aria-label="Pedido de saída pendente">
          <strong>{pending.phase==='confirmed'?'Saída confirmada; atualização pendente':'Pedido aguardando confirmação'}</strong>
          <span>{pending.input.row.code} · {pending.input.row.location} · {pending.input.boxes} caixas · {outflowLabels[pending.input.reason]}</span>
          <p>O pedido foi guardado nesta aba. Confira-o antes de registrar outra saída. A conferência usa o mesmo identificador, inclusive após recarregar a página.</p>
          <button type="button" disabled={saving} onClick={()=>void resolvePending(pending)}>{saving?'Conferindo…':pending.phase==='confirmed'?'Atualizar pedido confirmado':'Conferir pedido pendente'}</button>
        </section>}
        <form onSubmit={submit} onChange={changed}>
          <fieldset disabled={saving||Boolean(pending)||Boolean(recovery.error)}>
            <div className="outflow-grid"><label>Categoria<select value={springs?'springs':'shocks'} onChange={(e)=>{setSprings(e.target.value==='springs');setSource('')}}><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label>
            <label>Motivo da saída<select value={reason} onChange={(e)=>{setReason(e.target.value as OutflowReason);setSource('')}}>{Object.entries(outflowLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
            <label>Saldo de origem<select required value={selected?source:''} onChange={(e)=>setSource(e.target.value)}><option value="">Escolha código, local e situação</option>{eligible.map((row)=><option key={keyOf(row)} value={keyOf(row)}>{row.code} · {row.location} · {row.status} · {row.boxes} caixas</option>)}</select></label>
            {!eligible.length&&!pending&&<p role="status">{reason==='sale'&&!springs?'Não há caixas de amortecedores liberadas para venda.':'Não há saldo disponível nesta categoria.'}</p>}
            {selected&&<div className="outflow-summary"><strong>{selected.code}</strong><span>{catalog[selected.code]?.application}</span><span>Saldo disponível: {selected.boxes} caixas</span><span>Saldo após esta saída: {after??'—'} caixas</span></div>}
            <div className="outflow-grid"><label>Quantidade de caixas<input type="number" required min="1" max={selected?.boxes??0} step="1" value={quantity} onChange={(e)=>setQuantity(e.target.value)}/></label>
            <label>Referência (opcional)<input maxLength={100} value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="Ex.: DEMO-VENDA-01"/></label></div>
            <label>Observação / destino {reason==='sale'?'(opcional)':'(obrigatório)'}<textarea required={reason!=='sale'} maxLength={500} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder={reason==='supplier_return'?'Informe para qual fornecedor e por que as caixas foram devolvidas.':reason==='discard'?'Informe o motivo e o destino do descarte.':'Referência ou observação da venda.'}/></label>
            <p>{springs?'Molas saem da situação Em estoque.':'Venda permite apenas amortecedores liberados. Descarte e devolução podem usar caixas aguardando teste ou liberadas.'} Apenas vendas contam para análises futuras de demanda.</p>
          </fieldset>
          <button type="submit" className="add-product-button" disabled={saving||Boolean(pending)||Boolean(recovery.error)||!selected}>{saving?'Registrando…':'Registrar saída'}</button>
        </form>
        {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="outflow-success" role="status">{message}</p>}
      </>}
    </section>
  </>
}
