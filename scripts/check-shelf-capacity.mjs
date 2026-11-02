import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const js=ts.transpileModule(await readFile('src/lib/shelf-capacity.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
assert.deepEqual(m.capacityRows(m.demoLocations,m.demoStock,m.demoCapacities).map(row=>[row.location,row.boxes,Math.round(row.percent*1e9)/1e9,row.excess]),[['NORTE',40,100,0],['SUL',12,20,0],['LESTE',33,110,3],['OESTE',0,0,0]])
const stock=[{location:'A01',boxes:3},{location:'A01',boxes:2},{location:'INATIVO',boxes:1}]
assert.deepEqual(m.capacityRows(['A01','VAZIO'],stock,{}).map(row=>[row.location,row.boxes,row.percent]),[['A01',5,null],['VAZIO',0,null],['INATIVO',1,null]])
const entries={A01:{boxes:10,basis:'Caixa validada'}}
assert.equal(m.capacityRows(['A01'],stock,entries)[0].percent,50)
const values=new Map();globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
m.saveCapacities('u','stock',entries,null)
const raw=m.readCapacityRaw('u','stock')
assert.deepEqual(m.parseCapacities(raw,'u'),entries)
assert.equal(m.readCapacityRaw('u','demo'),null);assert.equal(m.readCapacityRaw('outro','stock'),null)
assert.throws(()=>m.parseCapacities(raw,'outro'))
for(const boxes of [0,-1,1.5,2147483648])assert.throws(()=>m.parseCapacities(JSON.stringify({version:1,userId:'u',entries:{A01:{boxes,basis:'Caixa'}}}),'u'))
assert.throws(()=>m.parseCapacities(JSON.stringify({version:1,userId:'u',entries:{A01:{boxes:10,basis:''}}}),'u'))
assert.throws(()=>m.saveCapacities('u','stock',entries,null),/outra aba/)
const old=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')}
assert.throws(()=>m.saveCapacities('u','stock',entries,raw),/quota/)
assert.equal(m.readCapacityRaw('u','stock'),raw);localStorage.setItem=old
m.saveCapacities('u','stock',{},raw)
assert.equal(m.capacityRows(['A01'],stock,m.parseCapacities(m.readCapacityRaw('u','stock'),'u'))[0].percent,null)
assert.throws(()=>m.capacityRows(['A01'],[{location:'A01',boxes:-1}],{}))
console.log('Novos cenários de capacidade aprovados: exemplos, referência física, excesso, vazio/desconhecido, saldo fora dos locais ativos, validação, conta/modo, conflito, quota e remoção.')
