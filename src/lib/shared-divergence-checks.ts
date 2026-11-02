import type {SharedCount} from './presentation-counts'
import type {CountReview} from './presentation-count-reviews'
import type {DivergenceCheck} from './recurring-divergences'

export function bahiaDay(value:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value))
 const part=(type:string)=>parts.find(part=>part.type===type)!.value
 return `${part('year')}-${part('month')}-${part('day')}`
}
// Entradas já validadas pelo fluxo compartilhado; a identidade é a do envio,
// nunca a da revisão, para não contar duas vezes a mesma conferência.
export function sharedDivergenceChecks(counts:SharedCount[],reviews:Record<string,CountReview>):DivergenceCheck[]{
 return counts.filter(count=>reviews[count.id]?.decision==='approved').flatMap(count=>count.submission.rows.map(row=>({sessionId:count.id,date:bahiaDay(count.created_at),code:row.code,location:count.location,status:row.status,expected:row.expected,counted:row.counted!,reviewed:true})))
}
