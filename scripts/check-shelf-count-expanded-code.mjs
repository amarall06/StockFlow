import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const compile=async file=>ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
const category=url(await compile('src/lib/product-category.ts'))
const {beginShelfCount,parseShelfCount}=await import(url((await compile('src/lib/shelf-count.ts')).replace("'./product-category'",JSON.stringify(category))))
for(const [code,status] of [['AGM-35ABC','Liberado para venda'],['MGM-100A','Em estoque'],['AGM-01','Aguardando testagem']]) {
  const draft=beginShelfCount('u','A01',[{code,status,location:'A01',boxes:1}],'2026-11-01T10:00:00Z')
  assert.equal(parseShelfCount(JSON.stringify(draft),'u').rows[0].code,code)
}
console.log('3 casos novos de códigos ampliados na contagem aprovados, incluindo molas e sufixo.')
