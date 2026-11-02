import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
async function load(file){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64'))}
const m=await load('src/lib/stock-age.ts'),{demoStock}=await load('src/lib/shelf-capacity.ts')
const before=JSON.stringify([m.sampleStockAgeGroups,demoStock]),sum=(rows,situation)=>rows.filter(row=>row.situation===situation).reduce((total,row)=>total+row.boxes,0)
const rows=m.stockAgeRows(m.sampleStockAgeGroups,demoStock,90,m.stockAgeReference)
assert.equal(sum(rows,'older'),35);assert.equal(sum(rows,'recent'),35);assert.equal(sum(rows,'unknown'),15)
assert.equal(sum(m.stockAgeRows(m.sampleStockAgeGroups,demoStock,30,m.stockAgeReference),'older'),44)
assert.equal(rows[0].id,'E-09');assert.equal(rows[0].age,124)
const group={...m.sampleStockAgeGroups[0],boxes:1,receivedOn:'2026-08-04'},stock=[{code:group.code,location:group.location,status:group.status,boxes:1}]
assert.equal(m.stockAgeRows([group],stock,90,m.stockAgeReference)[0].situation,'older','limite exato incluído')
const moved=m.stockAgeRows([{...group,location:'OESTE'}],[{...stock[0],location:'OESTE'}],90,m.stockAgeReference)
assert.equal(moved[0].age,90,'mudança de local preserva origem')
assert.equal(m.stockAgeRows([{...group,receivedOn:'2026-11-03'}],stock,90,m.stockAgeReference)[0].situation,'future')
assert.throws(()=>m.stockAgeRows([{...group,receivedOn:'2026-02-30'}],stock,90,m.stockAgeReference),/Data/)
assert.throws(()=>m.stockAgeRows([group,group],stock,90,m.stockAgeReference),/Grupos/)
assert.throws(()=>m.stockAgeRows([],stock,90,m.stockAgeReference),/sem grupo/)
assert.throws(()=>m.stockAgeRows([{...group,status:'Em estoque'}],stock,90,m.stockAgeReference),/Grupos/)
for(const value of [0,-1,1.5,3651,NaN])assert.throws(()=>m.validateStockAgeDays(value))
assert.equal(JSON.stringify([m.sampleStockAgeGroups,demoStock]),before)
const values=new Map();globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
let events=0;const stop=m.subscribeStockAge(()=>events++)
m.saveStockAgeDays('a',30,null)
assert.equal(m.parseStockAgeDays(m.readStockAgeRaw('a'),'a'),30)
assert.equal(m.parseStockAgeDays(m.readStockAgeRaw('b'),'b'),90)
assert.throws(()=>m.parseStockAgeDays(m.readStockAgeRaw('a'),'b'))
assert.throws(()=>m.saveStockAgeDays('a',90,null),/outra aba/)
assert.equal(events,1);stop();window.dispatchEvent(new Event('liber:stock-age'));assert.equal(events,1)
const raw=m.readStockAgeRaw('a');localStorage.setItem=()=>{throw Error('quota')}
assert.throws(()=>m.saveStockAgeDays('a',90,raw),/quota/);assert.equal(m.readStockAgeRaw('a'),raw)
console.log('Novas verificações da permanência das caixas aprovadas.')
