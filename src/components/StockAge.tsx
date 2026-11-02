import {useRef,useState,useSyncExternalStore} from 'react'
import {parseStockAgeDays,readStockAgeRaw,sampleStockAgeGroups,saveStockAgeDays,stockAgeReference,stockAgeRows,subscribeStockAge} from '../lib/stock-age'
import {demoStock} from '../lib/shelf-capacity'
import {isSpringCode} from '../lib/product-category'
import {locateMissionShelf} from '../lib/map-navigation'
import './StockAge.css'

function AgeEditor({days,onSave}:{days:number;onSave:(value:number)=>void}){
  const[value,setValue]=useState(String(days))
  return <form aria-label="Configurar permanência" onSubmit={event=>{event.preventDefault();onSave(Number(value))}}>
    <label>Destacar a partir de (dias corridos)<input type="number" min={1} max={3650} step={1} required value={value} onChange={event=>setValue(event.target.value)}/></label>
    <button className="theme-toggle" type="submit">Salvar limite de permanência local</button>
  </form>
}
export function StockAge({userId,canEdit}:{userId:string;canEdit:boolean}){
  const raw=useSyncExternalStore(subscribeStockAge,()=>readStockAgeRaw(userId),()=>null)
  const[category,setCategory]=useState('all'),[message,setMessage]=useState({text:'',error:false}),busy=useRef(false)
  let days=90,error='',rows:ReturnType<typeof stockAgeRows>=[]
  try{days=parseStockAgeDays(raw,userId);rows=stockAgeRows(sampleStockAgeGroups,demoStock,days,stockAgeReference)}catch{error='Não foi possível avaliar a permanência. Dados preservados; confira a configuração e a referência dos grupos.'}
  const visible=rows.filter(row=>category==='all'||isSpringCode(row.code)===(category==='spring'))
  const sum=(situation:string)=>visible.filter(row=>row.situation===situation).reduce((total,row)=>total+row.boxes,0)
  const labels={older:'Limite atingido',recent:'Abaixo do limite',unknown:'Entrada sem data — conferir',future:'Entrada futura — conferir'}
  return <section className="inventory-panel dashboard-panel stock-age" aria-label="Permanência das caixas">
    <h2>Permanência das caixas</h2>
    <p>Referência da apresentação: 02/11/2026. Dias desde a entrada registrada do grupo; não é data de fabricação nem tempo desde a última venda. Mudança de prateleira não reinicia a entrada.</p>
    <p>Os grupos representam as 85 caixas do cenário. Entrada sem data permanece desconhecida, sem estimativa. O destaque não recomenda venda, descarte ou ajuste automático.</p>
    {error&&<p role="alert">{error}</p>}{message.text&&<p role={message.error?'alert':'status'}>{message.text}</p>}
    {!error&&<>
      <label>Categoria para permanência<select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">Amortecedores e molas</option><option value="shock">Amortecedores</option><option value="spring">Molas</option></select></label>
      <p role="status">{sum('older')} caixas com {days} dias ou mais · {sum('recent')} abaixo do limite · {sum('unknown')} sem data · {sum('future')} com data futura.</p>
      {!sum('older')&&<p>Nenhuma caixa com data conhecida atingiu o limite nesta categoria. Caixas sem data continuam exigindo conferência.</p>}
      <ul aria-label="Grupos por data de entrada">{visible.map(row=><li key={row.id}>
        <h3>{row.id} — {row.code} · {row.location}</h3><p>{row.status} · {row.boxes} caixas</p>
        <p>{row.receivedOn?`Entrada: ${row.receivedOn.split('-').reverse().join('/')}`:'Entrada sem data registrada'}{row.age!==null?` · ${row.age} dias desde a entrada`:''}</p>
        <strong>{labels[row.situation]}</strong>
        <button className="theme-toggle" type="button" onClick={()=>{try{locateMissionShelf(userId,row.location)}catch{setMessage({text:'Não foi possível localizar a prateleira no mapa.',error:true})}}}>Localizar grupo {row.id} no mapa</button>
      </li>)}</ul>
      {canEdit?<AgeEditor key={raw} days={days} onSave={value=>{
        if(busy.current)return
        busy.current=true
        try{saveStockAgeDays(userId,value,raw);setMessage({text:'Limite salvo neste navegador. Destaques recalculados sem alterar estoque.',error:false})}
        catch(caught){setMessage({text:caught instanceof Error?caught.message:'Não foi possível salvar o limite.',error:true})}
        finally{busy.current=false}
      }}/>:<p>O limite da apresentação é configurado pelo Administrador.</p>}
    </>}
  </section>
}
