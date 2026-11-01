import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const uri=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64')
const returns=uri((await readFile('src/lib/warranty-returns.ts','utf8')).replace("import { supabase } from './supabase'",'const supabase=null'))
const {validateOfflineReturn:validate}=await import(uri((await readFile('src/lib/offline-return-validation.ts','utf8')).replace("'./warranty-returns'",JSON.stringify(returns))))
const input={manufacturer_id:null,product_kind:'shock',product_code:'AGM-35',description:'Caixa',boxes:2,reason:'Conferir',location:'A01',ownership:'ours',status:'received',destination:''}
const previous={...input,id:'record',updated_at:'2026-11-01T10:00:00Z'}
assert.doesNotThrow(()=>validate({...input,description:'Descrição corrigida',status:'awaiting_test'},previous))
assert.throws(()=>validate({...input,product_kind:'spring',status:'awaiting_test'},previous))
assert.throws(()=>validate(input,{...previous,status:'closed'}))
assert.throws(()=>validate({...input,manufacturer_id:'m',status:'closed',boxes:3,destination:'Cliente'},{...previous,manufacturer_id:'m',status:'warranty'}))
assert.doesNotThrow(()=>validate({...input,manufacturer_id:'m',status:'closed',destination:'Cliente'},{...previous,manufacturer_id:'m',status:'warranty'}))
assert.throws(()=>validate({...input,status:'closed'},previous))
assert.doesNotThrow(()=>validate({...input,manufacturer_id:'m',status:'warranty'},previous))
console.log('7 verificações novas de transições e proteção do vínculo de garantia aprovadas.')
