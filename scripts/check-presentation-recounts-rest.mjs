import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
const env=await readFile('.env.local','utf8')
const setting=name=>env.split(/\r?\n/).find(line=>line.startsWith(name+'='))?.slice(name.length+1).trim().replace(/^['"]|['"]$/g,'')
const url=setting('VITE_SUPABASE_URL'),key=setting('VITE_SUPABASE_PUBLISHABLE_KEY')
if(new URL(url).hostname!=='tfatagbhmkeelbvstcvb.supabase.co'||!key)throw Error('Configuração de projeto inesperada.')
const read=await fetch(url+'/rest/v1/presentation_recount_links?select=parent_count_id',{headers:{apikey:key}})
const send=await fetch(url+'/rest/v1/rpc/submit_presentation_shelf_count',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_submission:{source_id:randomUUID(),recount_of:randomUUID()}})})
if(![401,403].includes(read.status)||![401,403].includes(send.status))throw Error('Vínculos ou recontagens acessíveis sem sessão.')
console.log(`Novos casos REST de vínculos aprovados: leitura HTTP ${read.status}; recontagem sem sessão HTTP ${send.status}.`)
