import {supabase} from './supabase'
import {parsePublishedPresentation,presentationScenarioKey} from './presentation-bundle'
export async function loadPublishedPresentation(signal:AbortSignal){
  if(!supabase)throw Error('Supabase não configurado.')
  const{data,error}=await supabase.from('presentation_scenarios').select('scenario_key,revision,payload,published_at').eq('scenario_key',presentationScenarioKey).abortSignal(signal).maybeSingle()
  if(error)throw error
  return parsePublishedPresentation(data)
}
