import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import ts from 'typescript'
const cache=new Map()
export async function loadPresentationModule(file){
  const path=resolve(file)
  if(cache.has(path))return cache.get(path)
  let code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
  const matches=[...code.matchAll(/from ['"]([^'"]+)['"]/g)]
  for(const match of matches){
    if(!match[1].startsWith('.'))throw Error('Módulo externo inesperado no cenário puro.')
    const dependency=await moduleUrl(resolve(dirname(path),match[1]+'.ts'))
    code=code.replace(match[0],`from '${dependency}'`)
  }
  const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64')
  cache.set(path,url)
  return url
}
async function moduleUrl(path){return loadPresentationModule(path)}
export async function presentationModule(){return import(await loadPresentationModule('src/lib/presentation-bundle.ts'))}
export async function writePresentationFixture(){
  const{presentationBundle,presentationScenarioKey}=await presentationModule()
  const fixture={scenario_key:presentationScenarioKey,revision:1,payload:presentationBundle,published_at:'2026-11-02T14:30:00Z'}
  await mkdir('tests/fixtures',{recursive:true})
  await writeFile('tests/fixtures/presentation-scenario.json',JSON.stringify(fixture,null,2)+'\n')
  const payload=JSON.stringify(presentationBundle).replaceAll("'","''")
  const sql=`begin;\ninsert into public.presentation_scenarios(scenario_key,revision,payload) values ('${presentationScenarioKey}',1,'${payload}'::jsonb) on conflict(scenario_key) do nothing;\ndo $$ begin\n if not exists(select 1 from public.presentation_scenarios where scenario_key='${presentationScenarioKey}' and revision=1 and payload='${payload}'::jsonb) then raise exception 'O cenário já existente diverge; nenhuma sobrescrita automática foi feita.';end if;\nend $$;\ncommit;\n`
  await writeFile('supabase/seeds/presentation-scenario-v1.sql',sql)
  return fixture
}
