import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
async function load(file){const js=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}
const {suggestSpaces:suggest,spaceChecks}=await load('src/lib/space-suggestions.ts')
const {demoStock:stock,demoCapacities:caps}=await load('src/lib/shelf-capacity.ts')
const req={kind:'shock',status:'Aguardando testagem',boxes:10,basis:'Caixa padrão'}
const original=JSON.stringify([stock,caps,spaceChecks])
assert.deepEqual(suggest(stock,caps,req).suggestions.map(row=>[row.location,row.available]),[['OESTE',40]])
const spring={...req,kind:'spring',status:'Em estoque'}
assert.deepEqual(suggest(stock,caps,spring).suggestions.map(row=>[row.location,row.available]),[['SUL',30],['OESTE',40]])
assert.deepEqual(suggest(stock,caps,{...spring,boxes:35}).suggestions.map(row=>row.location),['OESTE'])
assert.equal(suggest(stock,caps,{...spring,boxes:41}).suggestions.length,0)
assert.equal(suggest(stock,{},req).suggestions.length,0)
assert.equal(suggest(stock,caps,{...req,basis:'Caixa maior'}).suggestions.length,0)
assert.equal(suggest(stock,{...caps,OESTE:{boxes:5,basis:'Caixa padrão'}},req).suggestions.length,0)
assert.equal(suggest(stock,caps,req,{...spaceChecks,OESTE:{...spaceChecks.OESTE,verifiedFree:-1}}).suggestions.length,0)
assert.equal(suggest(stock,caps,req,{...spaceChecks,OESTE:{...spaceChecks.OESTE,divergence:true}}).suggestions.length,0)
for(const boxes of [0,-1,1.5,NaN])assert.throws(()=>suggest(stock,caps,{...req,boxes}))
assert.throws(()=>suggest(stock,caps,{...spring,status:'Aguardando testagem'}))
assert.throws(()=>suggest([{...stock[0],boxes:-1}],caps,req))
assert.equal(JSON.stringify([stock,caps,spaceChecks]),original)
const f=await load('src/lib/floor-plan.ts')
const fresh=f.parseFloorPlan(null,'u');fresh.NORTE.x=20;assert.equal(f.initialFloorPlan.NORTE.x,19)
assert.throws(()=>f.validateFloorPlan({...fresh,NORTE:{...fresh.NORTE,width:49}}))
assert.throws(()=>f.validateFloorPlan({...fresh,SUL:{...fresh.NORTE}}))
assert.throws(()=>f.parseFloorPlan(JSON.stringify({version:1,userId:'outro',layout:fresh}),'u'))
const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
const saved=f.saveFloorPlan('u',fresh,null)
assert.equal(f.parseFloorPlan(saved,'u').NORTE.x,20)
assert.throws(()=>f.saveFloorPlan('u',fresh,null),/outra aba/)
const old=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')}
assert.throws(()=>f.saveFloorPlan('u',fresh,saved),/quota/);assert.equal(localStorage.getItem(f.floorPlanKey('u')),saved)
localStorage.setItem=old
console.log('Novos cenários aprovados: compatibilidade, limite físico conferido, divergência, falta de capacidade, padrão de caixa, ranking, quantidade, planta válida, limites/sobreposição, isolamento, quota e conflito local.')
