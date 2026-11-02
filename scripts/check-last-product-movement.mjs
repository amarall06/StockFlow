import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const source=await readFile('src/lib/last-product-movement.ts','utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const {lastProductMovements:load}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const start='2026-10-01T00:00:00Z', old='2026-09-01T00:00:00Z'
let active=0, maximum=0, calls=0
const codes=Array.from({length:11},(_,i)=>'P'+i)
const result=await load([...codes,'P0'],start,async code=>{calls++;active++;maximum=Math.max(maximum,active);await new Promise(resolve=>setTimeout(resolve,2));active--;return code==='P0'?null:{code,created_at:old}})
assert.equal(calls,11);assert.equal(maximum,4);assert.equal(result.P0,null);assert.equal(result.P10,old)
assert.deepEqual(await load([],start,()=>{throw Error('não deve consultar')}),{})
await assert.rejects(load(['P'],start,async()=>{throw Error('sem acesso')}),/sem acesso/)
for(const row of [{code:'outro',created_at:old},{code:'P',created_at:'inválida'},{code:'P',created_at:start}]) {
  await assert.rejects(load(['P'],start,async()=>row),/inválida/)
}
console.log('6 cenários novos aprovados: histórico anterior/ausência, deduplicação e limite de concorrência, vazio, recusa, produto incorreto e data inválida/fora da janela.')
