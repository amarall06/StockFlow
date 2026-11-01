import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const uri=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64')
const category=uri(await readFile('src/lib/product-category.ts','utf8'))
const {validateBalance:validate,InventoryConsistencyError}=await import(uri((await readFile('src/lib/inventory-consistency.ts','utf8')).replace("'./product-category'",JSON.stringify(category))))
const valid={quantity:3,status:'awaiting_test',code:'AGM-35',locationKnown:true}
assert.doesNotThrow(()=>validate(valid))
for(const quantity of [-1,0.5,NaN,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>validate({...valid,quantity}),InventoryConsistencyError)
assert.throws(()=>validate({...valid,code:undefined}),InventoryConsistencyError)
assert.throws(()=>validate({...valid,locationKnown:false}),InventoryConsistencyError)
assert.throws(()=>validate({...valid,code:'MGM-35'}),InventoryConsistencyError)
assert.doesNotThrow(()=>validate({...valid,code:'MGM-35',status:'in_stock'}))
assert.doesNotThrow(()=>validate({...valid,quantity:0,code:undefined,locationKnown:false}))
console.log('10 verificações novas de consistência aprovadas; nenhuma correção automática de saldos.')
