import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
async function load(file){const js=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}
const {fictionalShelfMap:map}=await load('src/lib/shelf-map.ts'),{demoStock}=await load('src/lib/shelf-capacity.ts')
const before=JSON.stringify(demoStock)
const result=map(demoStock,'  agm-35 ')
assert.deepEqual(result.matches.map(row=>[row.location,row.matchedBoxes]),[['NORTE',40],['LESTE',33]])
assert.deepEqual(map(demoStock,'mgm').matches.map(row=>row.location),['SUL'])
assert.equal(map(demoStock,'inexistente').matches.length,0)
assert.equal(map(demoStock,'inexistente').shelves.reduce((sum,row)=>sum+row.boxes,0),85)
assert.equal(map(demoStock,'').matches.length,0)
assert.equal(result.shelves.find(row=>row.location==='OESTE').state,'Sem caixas')
const east=result.shelves.find(row=>row.location==='LESTE')
assert.equal(east.count.reference-east.count.counted,2)
assert.equal(east.boxes,33)
assert.throws(()=>map([{...demoStock[0],location:'REAL'}],''))
assert.throws(()=>map([{...demoStock[0],boxes:-1}],''))
assert.throws(()=>map([{...demoStock[0],boxes:1.5}],''))
assert.equal(JSON.stringify(demoStock),before)
console.log('Novos cenários de mapa aprovados: busca parcial/normalizada, múltiplos locais, vazio/ausência sem apagar saldo, divergência distinta de capacidade, validação e dados preservados.')
