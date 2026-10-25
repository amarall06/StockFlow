import {useEffect,useRef,useState,type FormEvent} from 'react'
import type {ProductInfo,StockRow} from '../lib/inventory-api'
import {calculateStockAlerts} from '../lib/stock-alerts'
import {saveStockMinimum} from '../lib/stock-minimum-api'
import {EditButton} from './EditButton'
import './StockAlerts.css'

function MinimumDialog({catalog,codes,initialCode,onClose,onSaved}:{catalog:Record<string,ProductInfo>;codes:string[];initialCode:string;onClose:()=>void;onSaved:()=>void}){
  const dialogRef=useRef<HTMLDialogElement>(null)
  const requestId=useRef<string|null>(null)
  // O instante da leitura fica junto do rascunho, evitando sobrescrever uma edição concorrente.
  const [draft,setDraft]=useState(()=>({code:initialCode,value:catalog[initialCode]?.minimumBoxes?.toString()??'',expected:catalog[initialCode]?.minimumUpdatedAt??''}))
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{const dialog=dialogRef.current;dialog?.showModal();return()=>{dialog?.close()}},[])
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(saving||!draft.expected)return
    setSaving(true);setError('')
    try{requestId.current??=crypto.randomUUID();await saveStockMinimum(draft.code,draft.value,draft.expected,requestId.current);onSaved()}
    catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível salvar.')}
    finally{setSaving(false)}
  }
  return <dialog ref={dialogRef} className="minimum-dialog" aria-labelledby="minimum-title" onCancel={(event)=>{event.preventDefault();if(!saving)onClose()}}>
    <div className="minimum-heading"><h2 id="minimum-title">Configurar estoque mínimo</h2><button type="button" className="theme-toggle" disabled={saving} onClick={onClose}>Fechar</button></div>
    <form onSubmit={submit}><fieldset disabled={saving}>
      <label>Produto<select value={draft.code} onChange={(e)=>{const code=e.target.value;setDraft({code,value:catalog[code].minimumBoxes?.toString()??'',expected:catalog[code].minimumUpdatedAt??''});requestId.current=null;setError('')}}>{codes.map((code)=><option key={code} value={code}>{code} · {catalog[code].minimumBoxes===null||catalog[code].minimumBoxes===undefined?'sem mínimo':`mínimo ${catalog[code].minimumBoxes} caixas`}</option>)}</select></label>
      <label>Estoque mínimo (caixas)<input type="number" min="0" max="2147483647" step="1" value={draft.value} onChange={(e)=>{setDraft({...draft,value:e.target.value});requestId.current=null;setError('')}} placeholder="Vazio = não configurado"/></label>
    </fieldset><p>O alerta aparece quando o estoque total chega ao limite ou fica abaixo dele. Deixe vazio para remover o limite; zero é um valor configurado.</p>
      {error&&<p className="auth-error" role="alert">{error}</p>}<button type="submit" className="add-product-button" disabled={saving||!draft.expected}>{saving?'Salvando…':'Salvar limite'}</button>
    </form>
  </dialog>
}

export function StockAlerts({catalog,stock,springs,ready,isAdministrator,onRefresh}:{
  catalog:Record<string,ProductInfo>;stock:StockRow[];springs:boolean;ready:boolean;isAdministrator:boolean;onRefresh:()=>Promise<void>
}){
  const [editing,setEditing]=useState<string|null>(null)
  const [showAll,setShowAll]=useState(false)
  const [refreshing,setRefreshing]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const summary=calculateStockAlerts(catalog,stock,springs)
  const alerts=summary.filter((row)=>row.severity!=='ok')
  const codes=summary.map((row)=>row.code).sort()
  const zeros=summary.filter((row)=>row.severity==='zero').length
  const lows=summary.filter((row)=>row.severity==='low').length
  const configured=summary.filter((row)=>row.minimum!==null).length
  async function refresh(){setRefreshing(true);setError('');try{await onRefresh()}catch{setError('Não foi possível atualizar os alertas. Tente novamente.')}finally{setRefreshing(false)}}
  function saved(){
    setEditing(null);setMessage('Limite salvo.');setError('');setRefreshing(true)
    void onRefresh().catch(()=>setError('Limite salvo. Atualize os alertas para consultar o valor atual.')).finally(()=>setRefreshing(false))
  }
  return <section className="inventory-panel stock-alerts" aria-labelledby="stock-alerts-title">
    <div className="alerts-heading"><div><h2 id="stock-alerts-title">Alertas de reposição</h2><p>{springs?'Conta todas as caixas de molas em estoque.':'Soma caixas aguardando teste e liberadas, em todas as localizações.'} Garantia não entra nesta contagem.</p></div>
      {ready&&<div className="alerts-actions"><button type="button" className="theme-toggle" disabled={refreshing} onClick={()=>void refresh()}>Atualizar alertas</button>{isAdministrator&&codes.length>0&&<button type="button" className="add-product-button" disabled={refreshing} onClick={()=>setEditing(codes[0])}>Configurar mínimos</button>}</div>}
    </div>
    {!ready?<p className="alerts-message" role="status">Os alertas de reposição aguardam ativação no banco.</p>:<>
      <div className="alerts-totals"><span><strong>{zeros}</strong> produtos sem estoque</span><span><strong>{lows}</strong> no mínimo ou abaixo</span><span><strong>{configured}/{summary.length}</strong> limites configurados</span></div>
      {message&&<p className="alerts-message" role="status">{message}</p>}{error&&<p className="alerts-message auth-error" role="alert">{error}</p>}
      {!summary.length?<p className="alerts-message">Nenhum produto cadastrado nesta categoria.</p>:!alerts.length?<p className="alerts-message">Nenhum produto zerado ou no limite configurado.{configured===0?' Os limites mínimos ainda não foram definidos.':''}</p>:<>
        <ul className="stock-alert-cards">{(showAll?alerts:alerts.slice(0,6)).map((row)=><li className={`stock-alert-${row.severity}`} key={row.code}>
          <div className="alert-card-title"><strong>{row.code}</strong><span>{row.severity==='zero'?'Sem estoque':'Repor estoque'}</span>{isAdministrator&&<EditButton label={`Editar mínimo de ${row.code}`} disabled={refreshing} onClick={()=>setEditing(row.code)}/>}</div>
          <p>{catalog[row.code].application}</p><p><strong>{row.total} caixas no estoque</strong> · {row.minimum===null?'mínimo não configurado':`mínimo: ${row.minimum} caixas`}</p>
          {!springs&&<p>Disponíveis para venda: {row.available} · Aguardando teste: {row.awaiting}</p>}
        </li>)}</ul>
        {alerts.length>6&&<button type="button" className="theme-toggle" onClick={()=>setShowAll((value)=>!value)}>{showAll?'Mostrar prévia':`Ver todos os ${alerts.length} alertas`}</button>}
      </>}
      {editing&&<MinimumDialog catalog={catalog} codes={codes} initialCode={editing} onClose={()=>setEditing(null)} onSaved={saved}/>}
    </>}
  </section>
}
