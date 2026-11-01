import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const code=ts.transpileModule(await readFile('src/lib/offline-stock.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {saveOfflineStock:save,clearOfflineStock:clear,retainOfflineStockFor:retain}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const storage={};Object.defineProperties(storage,{getItem:{value:key=>storage[key]??null},setItem:{value:(key,value)=>{storage[key]=value}},removeItem:{value:key=>{delete storage[key]}}});globalThis.localStorage=storage
let online=true;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get onLine(){return online}}})
const snapshot={stock:[{code:'AGM-35',boxes:3,location:'A01',status:'Aguardando testagem'}],catalog:{private:'not saved'}}
save('a',snapshot,100);const saved=JSON.parse(storage['liber:offline-stock:v1:a']);assert.equal(saved.expiresAt,900100);assert.equal(saved.catalog,undefined)
retain('a');assert.equal(storage['liber:offline-stock:v1:account'],'a')
retain('b');assert.equal(Object.keys(storage).length,0)
save('a',snapshot,100);save('b',snapshot,200);assert.equal(storage['liber:offline-stock:v1:a'],undefined)
online=false;save('c',snapshot,300);assert.equal(storage['liber:offline-stock:v1:account'],'b')
storage.unrelated='keep';clear();assert.deepEqual(Object.keys(storage),['unrelated'])
console.log('6 verificações novas de armazenamento, prazo, isolamento e limpeza aprovadas.')
