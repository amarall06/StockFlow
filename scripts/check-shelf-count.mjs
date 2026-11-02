import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const compile=async path=>ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
const category=url(await compile('src/lib/product-category.ts'))
const modelUrl=url((await compile('src/lib/shelf-count.ts')).replace("'./product-category'",JSON.stringify(category)))
const model=await import(modelUrl)
const store=await import(url((await compile('src/lib/shelf-count-store.ts')).replace("'./shelf-count'",JSON.stringify(modelUrl))))
const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};globalThis.window=new EventTarget()
const stock=[{code:'AGM-35',status:'Aguardando testagem',location:'A01',boxes:3},{code:'MGM-35',status:'Em estoque',location:'A01',boxes:2}]
const draft=model.beginShelfCount('u','A01',stock,'2026-11-01T10:00:00Z')
assert.deepEqual(model.countSummary(draft),{pending:2,differences:0,missing:0,extra:0})
assert.throws(()=>model.shelfCountReport(draft,false),/Preencha/)
assert.equal(model.shelfReference([...stock].reverse(),'A01'),draft.reference)
const counted={...draft,notes:'=texto da empresa',rows:draft.rows.map(row=>({...row,counted:row.code==='AGM-35'?0:5}))}
assert.deepEqual(model.countSummary(counted),{pending:0,differences:2,missing:3,extra:3})
assert.deepEqual(model.parseShelfCount(JSON.stringify(counted),'u'),counted)
assert.throws(()=>model.parseShelfCount(JSON.stringify(counted),'outro'))
for(const invalid of [
  {...counted,rows:[{...counted.rows[0],counted:-1},counted.rows[1]]},
  {...counted,rows:[{...counted.rows[0],counted:1.5},counted.rows[1]]},
  {...counted,rows:[...counted.rows,counted.rows[0]]},
  {...counted,rows:counted.rows.slice(1)},
  {...counted,rows:counted.rows.map(row=>({...row,expected:99}))},
  {...counted,rows:[...counted.rows,{code:'MGM-12',status:'Liberado para venda',expected:0,counted:1}]},
]) assert.throws(()=>model.parseShelfCount(JSON.stringify(invalid),'u'))
assert.notEqual(model.shelfReference([{...stock[0],boxes:4},stock[1]],'A01'),draft.reference)
assert.equal(counted.rows[0].expected,3)
const report=model.shelfCountReport(counted,true)
assert.equal(report[0].length,model.shelfCountHeaders.length)
assert.equal(report[0][1],'Rascunho local — não aprovado');assert.equal(report[0][10],'Sim — recontagem necessária')
let events=0;const stop=store.subscribeShelfCount(()=>events++)
store.saveShelfCount('u',counted,null);const raw=store.readShelfCountRaw('u')
assert.equal(events,1);assert.equal(store.readShelfCountRaw('outro'),null)
assert.throws(()=>store.saveShelfCount('u',draft,null),/outra aba/)
assert.equal(store.readShelfCountRaw('u'),raw)
stop();store.saveShelfCount('u',null,raw);assert.equal(events,1);assert.equal(store.readShelfCountRaw('u'),null)
values.set(store.shelfCountKey('u'),'dados inválidos')
assert.throws(()=>model.parseShelfCount(store.readShelfCountRaw('u'),'u'))
assert.equal(values.get(store.shelfCountKey('u')),'dados inválidos')
const original=localStorage.setItem;localStorage.setItem=()=>{throw Error('sem espaço')}
assert.throws(()=>store.saveShelfCount('u',draft,'dados inválidos'),/sem espaço/);assert.equal(store.readShelfCountRaw('u'),'dados inválidos')
localStorage.setItem=original
console.log('Contagem: novos cenários de branco/zero, diferenças separadas, referência estável, validação, conta, relatório, mudanças de saldo, revisão entre abas, eventos, falha de armazenamento e preservação aprovados.')
