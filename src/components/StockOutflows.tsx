import { useRef, useState, type FormEvent } from 'react'
import type { ProductInfo, StockRow } from '../lib/inventory-api'
import { eligibleOutflows, outflowLabels, registerOutflow, type OutflowReason } from '../lib/outflow-api'
import './StockOutflows.css'

const keyOf=(row:StockRow)=>JSON.stringify([row.code,row.location,row.status])

export function StockOutflows({stock,catalog,ready,isAdministrator,onRefresh}:{
  stock:StockRow[];catalog:Record<string,ProductInfo>;ready:boolean;isAdministrator:boolean;onRefresh:()=>Promise<void>
}) {
  const [springs,setSprings]=useState(false)
  const [reason,setReason]=useState<OutflowReason>('sale')
  const [source,setSource]=useState('')
  const [quantity,setQuantity]=useState('1')
  const [notes,setNotes]=useState('')
  const [reference,setReference]=useState('')
  const [saving,setSaving]=useState(false)
  const [recorded,setRecorded]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const requestId=useRef<string|null>(null)
  const eligible=eligibleOutflows(stock,springs,reason)
  const selected=eligible.find((row)=>keyOf(row)===source)
  const boxes=Number(quantity)
  const after=selected && Number.isInteger(boxes) && boxes>0 && boxes<=selected.boxes ? selected.boxes-boxes : null
  function changed(){requestId.current=null;setError('');setMessage('')}
  async function refreshSaved(){
    try{await onRefresh();setRecorded(false);setSource('');setQuantity('1');setNotes('');setReference('');requestId.current=null;setError('');setMessage('Saída registrada. Estoque e histórico atualizados.')}
    catch{setError('Saída já salva. Use Atualizar estoque para consultar o saldo sem retirar novamente.')}
  }
  async function refresh(){
    if(saving)return
    setSaving(true)
    try{if(recorded)await refreshSaved();else{await onRefresh();setError('')}}
    catch{setError('Não foi possível atualizar o estoque. Tente novamente.')}
    finally{setSaving(false)}
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!ready||!isAdministrator||saving||recorded)return
    if(!selected){setError('Escolha um saldo de origem disponível.');return}
    setSaving(true);setError('');setMessage('')
    try{
      requestId.current??=crypto.randomUUID()
      await registerOutflow({row:selected,boxes,reason,notes,reference},requestId.current)
      setRecorded(true)
      await refreshSaved()
    }catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível registrar a saída.')}
    finally{setSaving(false)}
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">AMORTECEDORES E MOLAS</p><h1>Saídas de estoque</h1><p className="subtitle">Registre a retirada de caixas e acompanhe o motivo no Histórico.</p></div></div>
    <section className="inventory-panel outflow-panel" aria-label="Registrar saída de caixas">
      {!isAdministrator?<p>O registro de saídas está disponível apenas para Administrador nesta etapa.</p>:!ready?<p role="status">O registro de saídas aguarda ativação no banco.</p>:<>
        <div className="outflow-heading"><div><h2>Registrar saída</h2><p>A operação desconta caixas do estoque normal. Transferências e garantia têm controles próprios.</p></div><button type="button" className="theme-toggle" disabled={saving} onClick={()=>void refresh()}>Atualizar estoque</button></div>
        <form onSubmit={submit} onChange={changed}>
          <fieldset disabled={saving||recorded}>
            <div className="outflow-grid"><label>Categoria<select value={springs?'springs':'shocks'} onChange={(e)=>{setSprings(e.target.value==='springs');setSource('')}}><option value="shocks">Amortecedores</option><option value="springs">Molas</option></select></label>
            <label>Motivo da saída<select value={reason} onChange={(e)=>{setReason(e.target.value as OutflowReason);setSource('')}}>{Object.entries(outflowLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
            <label>Saldo de origem<select required value={selected?source:''} onChange={(e)=>setSource(e.target.value)}><option value="">Escolha código, local e situação</option>{eligible.map((row)=><option key={keyOf(row)} value={keyOf(row)}>{row.code} · {row.location} · {row.status} · {row.boxes} caixas</option>)}</select></label>
            {!eligible.length&&<p role="status">{reason==='sale'&&!springs?'Não há caixas de amortecedores liberadas para venda.':'Não há saldo disponível nesta categoria.'}</p>}
            {selected&&<div className="outflow-summary"><strong>{selected.code}</strong><span>{catalog[selected.code]?.application}</span><span>Saldo disponível: {selected.boxes} caixas</span><span>Saldo após esta saída: {after??'—'} caixas</span></div>}
            <div className="outflow-grid"><label>Quantidade de caixas<input type="number" required min="1" max={selected?.boxes??0} step="1" value={quantity} onChange={(e)=>setQuantity(e.target.value)}/></label>
            <label>Referência (opcional)<input maxLength={100} value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="Ex.: DEMO-VENDA-01"/></label></div>
            <label>Observação / destino {reason==='sale'?'(opcional)':'(obrigatório)'}<textarea required={reason!=='sale'} maxLength={500} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder={reason==='supplier_return'?'Informe para qual fornecedor e por que as caixas foram devolvidas.':reason==='discard'?'Informe o motivo e o destino do descarte.':'Referência ou observação da venda.'}/></label>
            <p>{springs?'Molas saem da situação Em estoque.':'Venda permite apenas amortecedores liberados. Descarte e devolução podem usar caixas aguardando teste ou liberadas.'} Apenas vendas contam para análises futuras de demanda.</p>
          </fieldset>
          <button type="submit" className="add-product-button" disabled={saving||recorded||!selected}>{saving?'Registrando…':'Registrar saída'}</button>
        </form>
        {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="outflow-success" role="status">{message}</p>}
      </>}
    </section>
  </>
}
