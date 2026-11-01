import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const js=ts.transpileModule(await readFile('src/lib/inventory-insights.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const {inventoryInsights:insights}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const catalog={'AGM-35':{},'MGM-35':{}}
const stock=[{code:'AGM-35',location:'A01',boxes:3},{code:'AGM-35',location:'A02',boxes:2},{code:'MGM-35',location:'A03',boxes:5}]
const movement={id:'a',created_at:'2026-10-31T12:00:00Z',quantity:2,product:{code:'AGM-35'},origin:{code:'A01'},destination:{code:'A02'}}
let result=insights(catalog,stock,[movement,movement,{...movement,id:'b',created_at:'2026-10-30T12:00:00Z',origin:{code:'A01'},destination:{code:'A01'}}])
assert.equal(result.products[0].code,'MGM-35')
assert.equal(result.products[0].last,null)
assert.equal(result.products[1].boxes,5)
assert.deepEqual(result.products[1].locations,['A01','A02'])
assert.equal(result.products[1].last,movement.created_at)
assert.deepEqual(result.locations.map(row=>[row.code,row.operations,row.boxes]),[['A01',2,4],['A02',1,2],['A03',0,0]])
assert.deepEqual(insights({},[],[]),{products:[],locations:[]})
assert.throws(()=>insights(catalog,stock,[{...movement,quantity:-1}]))
assert.throws(()=>insights(catalog,stock,[{...movement,created_at:'inválida'}]))
console.log('9 verificações novas de atividade aprovadas: sem evento, totais, locais, último evento, deduplicação, vazio e dados inválidos.')
