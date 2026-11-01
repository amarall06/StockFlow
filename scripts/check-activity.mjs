import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
let source=await readFile(new URL('../src/lib/activity-api.ts',import.meta.url),'utf8')
source=source.replace("import { supabase } from './supabase'",'const supabase=null')
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
const {validateActivity}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const rows=Array.from({length:7},(_,i)=>({day:`2026-10-${String(i+1).padStart(2,'0')}`,sold_boxes:i,received_boxes:2*i}))
assert.deepEqual(validateActivity(rows.toReversed(),7),rows)
for(const bad of [null,rows.slice(1),rows.map(r=>({...r,sold_boxes:-1})),rows.map(r=>({...r,received_boxes:1.2})),[rows[0],...rows.slice(0,6)],rows.map(r=>({...r,day:'2026-02-31'})),rows.map((r,i)=>i===0?{...r,day:'2026-09-01'}:r)])assert.throws(()=>validateActivity(bad,7))
console.log('OK: atividade diária ordenada, campos válidos, dias consecutivos, duplicação, datas impossíveis e resposta incompleta.')
