import {supabase} from './supabase'
import {parseSharedCount,type SharedCount} from './presentation-counts'
import {parseRecountLink,type RecountLink} from './presentation-recounts'
export async function loadRecountLinks(counts:SharedCount[],signal:AbortSignal){
  if(!counts.length)return []
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const links:RecountLink[]=[]
  for(let offset=0;offset<counts.length;offset+=50){
  const ids=counts.slice(offset,offset+50).map(count=>count.id)
  const results=await Promise.all([
    supabase.from('presentation_recount_links').select('*').in('parent_count_id',ids).order('parent_count_id').abortSignal(signal),
    supabase.from('presentation_recount_links').select('*').in('child_count_id',ids).order('child_count_id').abortSignal(signal),
  ])
  if(results.some(result=>result.error||!Array.isArray(result.data)))throw Error('Não foi possível consultar os vínculos de recontagem.')
  links.push(...results.flatMap(result=>(result.data??[]).map(value=>parseRecountLink(value,counts))))
  }
  return links
}
export async function loadRelatedCount(id:string,signal:AbortSignal){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const {data,error}=await supabase.from('presentation_shelf_counts').select('*').eq('id',id).abortSignal(signal).single()
  if(error)throw Error('Não foi possível consultar a contagem vinculada. Confira sua conexão e seu acesso.')
  const count=parseSharedCount(data)
  if(count.id!==id)throw Error('O servidor retornou outra contagem.')
  return count
}
