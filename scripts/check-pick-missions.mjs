import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
async function load(file){const js=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}
const m=await load('src/lib/pick-missions.ts'),{demoStock}=await load('src/lib/shelf-capacity.ts')
const original=JSON.stringify(demoStock)
let state=m.parseMissions(null,'u')
state=m.startPickMission(state,'PED-1001',demoStock)
assert.deepEqual(state.missions['PED-1001'].steps.map(row=>[row.location,row.status,row.quantity]),[['NORTE','Liberado para venda',8],['SUL','Em estoque',4]])
assert.throws(()=>m.startPickMission(state,'PED-1001',demoStock),/já possui missão/)
const first=state.missions['PED-1001'].steps[0]
assert.throws(()=>m.confirmPick(state,'PED-1001',first.id,'errado',8),/Código/)
assert.throws(()=>m.confirmPick(state,'PED-1001',first.id,m.pickCode(first),9))
assert.throws(()=>m.changeMissionStatus(state,'PED-1001','separated'),/todos/)
state=m.confirmPick(state,'PED-1001',first.id,' '+m.pickCode(first).toLowerCase()+' ',3)
assert.equal(state.missions['PED-1001'].steps[0].counted,3)
state=m.confirmPick(state,'PED-1001',first.id,m.pickCode(first),3)
assert.equal(state.missions['PED-1001'].steps[0].counted,3)
assert.throws(()=>m.confirmPick(state,'PED-1001',first.id,m.pickCode(first),2))
state=m.confirmPick(state,'PED-1001',first.id,m.pickCode(first),8)
const second=state.missions['PED-1001'].steps[1]
state=m.confirmPick(state,'PED-1001',second.id,m.pickCode(second),4)
state=m.changeMissionStatus(state,'PED-1001','separated')
state=m.startPickMission(state,'PED-1002',demoStock)
assert.throws(()=>m.startPickMission(state,'PED-1003',demoStock),/insuficiente/)
state=m.changeMissionStatus(state,'PED-1002','cancelled')
state=m.startPickMission(state,'PED-1003',demoStock)
assert.equal(state.missions['PED-1003'].steps[0].quantity,7)
assert.equal(JSON.stringify(demoStock),original)
const raw=JSON.stringify(state)
assert.deepEqual(m.parseMissions(raw,'u'),state)
assert.throws(()=>m.parseMissions(raw,'outro'))
assert.throws(()=>m.parseMissions(raw.replace('"counted":8','"counted":99'),'u'))
const values=new Map();globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
let changes=0;const stop=m.subscribeMissions(()=>changes++)
m.saveMissions(state,null);assert.equal(changes,1);assert.equal(m.readMissionRaw('outro'),null)
assert.throws(()=>m.saveMissions(state,null),/outra aba/)
const before=m.readMissionRaw('u');localStorage.setItem=()=>{throw Error('quota')}
assert.throws(()=>m.saveMissions(state,before),/quota/);assert.equal(m.readMissionRaw('u'),before)
stop();window.dispatchEvent(new Event('focus'));assert.equal(changes,1)
const nav=await load('src/lib/map-navigation.ts');globalThis.document={getElementById:()=>({})};let selected=''
const off=nav.subscribeMissionLocation('u',location=>{selected=location})
nav.locateMissionShelf('outro','NORTE');assert.equal(selected,'')
nav.locateMissionShelf('u','NORTE');assert.equal(selected,'NORTE');off();nav.locateMissionShelf('u','SUL');assert.equal(selected,'NORTE')
console.log('Novos cenários de missão aprovados: roteiro elegível, leitura e totais, parcial/idempotência, conclusão, destinação local, cancelamento, persistência/conta, validação, quota/conflito e navegação no mapa.')
