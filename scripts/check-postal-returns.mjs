import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const code=ts.transpileModule(await readFile('src/lib/postal-returns.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const state=m.parsePostalReturns(null,'postal-user')
assert.throws(()=>m.receivePostalReturn(state,'RET-2001',4,'intact','Conferido',false),/Confirme/)
assert.throws(()=>m.receivePostalReturn(state,'RET-2001',2,'intact','Conferido',true),/quantidade/)
for(const count of [-1,1.5,5])assert.throws(()=>m.receivePostalReturn(state,'RET-2001',count,'damaged','Caixa avariada',true))
for(const note of ['   ','a'.repeat(501)])assert.throws(()=>m.receivePostalReturn(state,'RET-2001',2,'damaged',note,true))
assert.throws(()=>m.receivePostalReturn(state,'RET-9999',1,'intact','Conferido',true))
const received=m.receivePostalReturn(state,'RET-2001',2,'damaged','  Duas caixas recebidas com avaria  ',true)
assert.equal(received.receipts['RET-2001'].notes,'Duas caixas recebidas com avaria')
assert.equal(received.receipts['RET-2001'].status,'awaiting-review')
assert.deepEqual(state.receipts,{})
assert.throws(()=>m.receivePostalReturn(received,'RET-2001',2,'damaged','Conferido',true),/duas vezes/)
assert.equal(m.receivePostalReturn(state,'RET-2002',3,'intact','Conferido no recebimento',true).receipts['RET-2002'].counted,3)
assert.equal(m.receivePostalReturn(state,'RET-2001',0,'mismatch','Volume vazio recebido',true).receipts['RET-2001'].counted,0)
assert.deepEqual(m.parsePostalReturns(JSON.stringify(received),'postal-user'),received)
assert.throws(()=>m.parsePostalReturns(JSON.stringify(received),'other'))
assert.throws(()=>m.parsePostalReturns(JSON.stringify(received).replace('awaiting-review','released'),'postal-user'))
assert.throws(()=>m.parsePostalReturns(JSON.stringify(received).replace('"receiptConfirmed":true','"receiptConfirmed":false'),'postal-user'))
const values=new Map();globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
let events=0;const stop=m.subscribePostalReturns(()=>events++)
m.savePostalReturns(received,null);assert.equal(events,1)
assert.deepEqual(m.parsePostalReturns(m.readPostalReturnsRaw('postal-user'),'postal-user'),received)
assert.equal(m.readPostalReturnsRaw('other'),null)
assert.throws(()=>m.savePostalReturns(received,null),/outra aba/)
stop();window.dispatchEvent(new Event('liber:postal-returns'));assert.equal(events,1)
const raw=m.readPostalReturnsRaw('postal-user');localStorage.setItem=()=>{throw Error('quota')}
assert.throws(()=>m.savePostalReturns(m.receivePostalReturn(received,'RET-2002',3,'intact','Volume conferido',true),raw),/quota/)
assert.equal(m.readPostalReturnsRaw('postal-user'),raw)
console.log('Novas verificações do recebimento de retornos dos Correios aprovadas.')
