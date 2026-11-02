import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const code=ts.transpileModule(await readFile('src/lib/recurring-divergences.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const checks=m.sampleDivergenceChecks, rule={occurrences:3,days:30}, before=JSON.stringify(checks)
const result=m.recurringDivergences(checks,rule,m.recurrenceReference)
assert.equal(result.length,1);assert.equal(result[0].location,'LESTE');assert.equal(result[0].absoluteDifference,6)
assert.deepEqual(result[0].evidence.map(row=>row.sessionId),['C-103','C-102','C-101'])
assert.deepEqual(m.recurringDivergences([...checks,checks[0]],rule,m.recurrenceReference),result,'mesma sessão não vira outra ocorrência')
assert.throws(()=>m.recurringDivergences([...checks,{...checks[0],counted:29}],rule,m.recurrenceReference),/conflitantes/)
const two=m.recurringDivergences(checks,{occurrences:2,days:30},m.recurrenceReference)
assert.equal(two.length,2);assert.equal(two[1].code,'MGM-35');assert.equal(two[1].absoluteDifference,2)
assert.equal(m.recurringDivergences(checks,{occurrences:2,days:7},m.recurrenceReference).length,0)
const example=checks[0]
const edge=[{...example,sessionId:'edge',date:'2026-10-04'},{...example,sessionId:'today',date:'2026-11-02'},{...example,sessionId:'outside',date:'2026-10-03'},{...example,sessionId:'future',date:'2026-11-03'}]
assert.equal(m.recurringDivergences(edge,{occurrences:2,days:30},m.recurrenceReference)[0].evidence.length,2)
assert.equal(m.recurringDivergences([{...example,sessionId:'a'},{...example,sessionId:'b',location:'NORTE'}],{occurrences:2,days:30},m.recurrenceReference).length,0)
assert.equal(m.recurringDivergences([{...example,sessionId:'a'},{...example,sessionId:'b',status:'Aguardando testagem'}],{occurrences:2,days:30},m.recurrenceReference).length,0)
assert.throws(()=>m.recurringDivergences([{...example,date:'2026-02-30'}],rule,m.recurrenceReference),/Data/)
for(const invalid of [{occurrences:1,days:30},{occurrences:2.5,days:30},{occurrences:3,days:0},{occurrences:3,days:3651}])assert.throws(()=>m.validateRecurrenceRule(invalid))
assert.equal(JSON.stringify(checks),before)
const values=new Map();globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
let events=0;const stop=m.subscribeRecurrence(()=>events++)
m.saveRecurrenceRule('a',{occurrences:2,days:7},null)
assert.deepEqual(m.parseRecurrenceRule(m.readRecurrenceRaw('a'),'a'),{occurrences:2,days:7})
assert.deepEqual(m.parseRecurrenceRule(m.readRecurrenceRaw('b'),'b'),rule)
assert.throws(()=>m.parseRecurrenceRule(m.readRecurrenceRaw('a'),'b'))
assert.throws(()=>m.saveRecurrenceRule('a',rule,null),/outra aba/)
assert.equal(events,1);stop();window.dispatchEvent(new Event('liber:recurrence-rule'));assert.equal(events,1)
const raw=m.readRecurrenceRaw('a');localStorage.setItem=()=>{throw Error('quota')}
assert.throws(()=>m.saveRecurrenceRule('a',rule,raw),/quota/);assert.equal(m.readRecurrenceRaw('a'),raw)
console.log('Novas verificações de divergências recorrentes aprovadas.')
