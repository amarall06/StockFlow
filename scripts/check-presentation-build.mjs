import assert from 'node:assert/strict'
import {readFile,stat} from 'node:fs/promises'
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'))
assert(manifest['index.html']?.isEntry,'Entrada do sistema ausente.')
assert(manifest['demonstracao.html']?.isEntry,'Entrada de apresentação ausente.')
assert.notEqual(manifest['index.html'].file,manifest['demonstracao.html'].file)
const seen=new Set()
async function visit(key){if(seen.has(key))return;seen.add(key);const entry=manifest[key];assert(entry);assert((await stat('dist/'+entry.file)).size>0);for(const css of entry.css??[])assert((await stat('dist/'+css)).size>0);for(const dependency of entry.imports??[])await visit(dependency)}
await visit('demonstracao.html')
assert(!seen.has('index.html'),'Apresentação depende da entrada autenticada.')
assert(!seen.has('src/InventoryApp.tsx'),'Apresentação depende do módulo de estoque real.')
const html=await readFile('dist/demonstracao.html','utf8')
assert(html.includes(manifest['demonstracao.html'].file))
console.log('Nova verificação do build multipágina aprovada: entradas distintas, recursos presentes e apresentação independente da entrada autenticada.')
