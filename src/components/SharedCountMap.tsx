import {useState} from 'react'
import type {SharedCount} from '../lib/presentation-counts'
import {reviewLabels,type CountReview} from '../lib/presentation-count-reviews'
import {countSummary,type ShelfCount} from '../lib/shelf-count'
import {regionalLocations} from '../lib/regional-locations'
import {locateMissionShelf} from '../lib/map-navigation'

const date=(value:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(value))
export function SharedCountMap({counts,reviews,userId,onHistory,stale}:{counts:SharedCount[];reviews:Record<string,CountReview>;userId:string;onHistory:(id:string)=>void;stale:boolean}){
 const[error,setError]=useState('')
 return <section aria-label="Mapa das conferências compartilhadas" className="shared-count-map">
  <h3>Conferências por região</h3>
  <p>Envios e decisões da apresentação consultados nesta tela: envios carregados e vínculos abertos. Sem registro nesta consulta não significa prateleira conferida. Aprovação não altera o estoque nem comprova espaço livre.</p>
  {stale&&<p role="status">Exibindo a consulta anterior; aguarde a atualização antes de usar estes resultados.</p>}
  <div className="shared-count-compass">
   {regionalLocations.map(location=>{
    const rows=counts.filter(count=>count.location===location).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id.localeCompare(a.id))
    const latest=rows[0],approved=rows.find(count=>reviews[count.id]?.decision==='approved')
    const decision=latest&&reviews[latest.id]
    const summary=approved&&countSummary({rows:approved.submission.rows} as ShelfCount)
    return <article key={location} className={`shared-count-region region-${location.toLowerCase()}`} aria-label={`Conferências de ${location}`}>
     <h4>{location}</h4>
     <p>Último envio: {latest?decision?reviewLabels[decision.decision]:'Aguardando revisão':'Sem envio nesta consulta'}.</p>
     {latest&&<><p>Enviado em {date(latest.created_at)} por {latest.actor_name}.</p><button type="button" className="theme-toggle" onClick={()=>onHistory(latest.id)}>Ver último envio de {location}</button></>}
     {approved&&summary?<>
      <p>Última aprovação nesta consulta: {date(reviews[approved.id].reviewed_at)} por {reviews[approved.id].reviewer_name}.</p>
      <p>{summary.differences} itens divergentes na contagem aprovada; faltam {summary.missing} caixas e sobram {summary.extra} caixas em relação à referência.</p>
      {latest?.id!==approved.id&&<p>Existe envio posterior à contagem aprovada; consulte a decisão do último envio.</p>}
      <button type="button" className="theme-toggle" onClick={()=>onHistory(approved.id)}>Ver aprovação de {location}</button>
     </>:<p>Sem aprovação nesta consulta.</p>}
     <button type="button" className="theme-toggle" onClick={()=>{try{locateMissionShelf(userId,location);setError('')}catch{setError('Não foi possível abrir a região na planta. Confira a configuração compartilhada abaixo.')}}}>Localizar {location} na planta</button>
    </article>
   })}
  </div>
  {error&&<p role="alert">{error}</p>}
 </section>
}
