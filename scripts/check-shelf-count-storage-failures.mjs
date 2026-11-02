import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const compile=async file=>ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
const category=url(await compile('src/lib/product-category.ts'))
const modelUrl=url((await compile('src/lib/shelf-count.ts')).replace("'./product-category'",JSON.stringify(category)))
const model=await import(modelUrl)
const store=await import(url((await compile('src/lib/shelf-count-store.ts')).replace("'./shelf-count'",JSON.stringify(modelUrl))))
const draft=model.beginShelfCount('u','A01',[],'2026-11-01T10:00:00Z')
let raw=null, writes=0
globalThis.window=new EventTarget()
globalThis.localStorage={getItem:()=>raw,setItem:()=>{writes++;throw Error('quota esgotada')},removeItem:()=>{throw Error('remoção recusada')}}
assert.throws(()=>store.saveShelfCount('u',draft,null),/quota esgotada/)
assert.equal(writes,1);assert.equal(raw,null)
raw=JSON.stringify(draft)
assert.throws(()=>store.saveShelfCount('u',null,raw),/remoção recusada/)
assert.equal(model.parseShelfCount(raw,'u').id,draft.id)
localStorage.getItem=()=>{throw Error('acesso negado')}
assert.equal(store.readShelfCountRaw('u'),'!storage-unavailable')
assert.throws(()=>model.parseShelfCount(store.readShelfCountRaw('u'),'u'))
console.log('3 casos novos de armazenamento aprovados: quota realmente recusada, remoção recusada com preservação e leitura bloqueada sem falso rascunho vazio.')
