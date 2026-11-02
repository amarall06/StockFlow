import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
const env=await readFile('.env.local','utf8')
const setting=name=>env.split(/\r?\n/).find(line=>line.startsWith(name+'='))?.slice(name.length+1).trim().replace(/^['"]|['"]$/g,'')
const url=setting('VITE_SUPABASE_URL'),key=setting('VITE_SUPABASE_PUBLISHABLE_KEY')
if(new URL(url).hostname!=='tfatagbhmkeelbvstcvb.supabase.co'||!key)throw Error('Configuração de projeto inesperada.')
const read=await fetch(url+'/rest/v1/presentation_layouts?select=scenario_key',{headers:{apikey:key}})
const write=await fetch(url+'/rest/v1/rpc/save_presentation_layout',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_expected_revision:1,p_layout:{},p_capacities:{},p_request_id:randomUUID()})})
if(![401,403].includes(read.status)||![401,403].includes(write.status))throw Error('A API anônima não bloqueou leitura/gravação da configuração.')
console.log(`Novos casos REST aprovados: leitura sem sessão HTTP ${read.status}; gravação sem sessão HTTP ${write.status}.`)
