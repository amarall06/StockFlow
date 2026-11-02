import {readFile} from 'node:fs/promises'
const env=await readFile('.env.local','utf8')
const setting=name=>env.split(/\r?\n/).find(line=>line.startsWith(name+'='))?.slice(name.length+1).trim().replace(/^['"]|['"]$/g,'')
const url=setting('VITE_SUPABASE_URL'),key=setting('VITE_SUPABASE_PUBLISHABLE_KEY')
if(new URL(url).hostname!=='tfatagbhmkeelbvstcvb.supabase.co'||!key)throw Error('Projeto ou configuração não corresponde à publicação verificada.')
const response=await fetch(url+'/rest/v1/presentation_scenarios?select=scenario_key',{headers:{apikey:key}})
if(![401,403].includes(response.status))throw Error('Leitura sem sessão não foi bloqueada pela API pública.')
console.log('Novo teste REST aprovado: leitura sem sessão bloqueada (HTTP '+response.status+').')
