import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/csv.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { createCsv, csvCell, downloadCsv } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
assert.equal(createCsv(['Código','Aplicação','Caixas'], [['AGM-35','Corsa; "teste"\n1999',2]]), '\uFEFF"Código";"Aplicação";"Caixas"\r\n"AGM-35";"Corsa; ""teste""\n1999";2\r\n')
assert.equal(csvCell(1.25), '1,25')
assert.equal(csvCell(null), '""')
assert.equal(csvCell('a\u0000b'), '"ab"')
for (const value of ['=HYPERLINK("x")','+1','-1','@SUM(A1)',' \t=1','\n=1','\ttexto','\rteste']) assert(csvCell(value).startsWith('"\''))
assert.equal(csvCell(-1), '-1') // Um número real não é texto de cadastro interpretado como fórmula.
assert.throws(()=>csvCell(NaN));assert.throws(()=>csvCell(Infinity))
assert.throws(()=>createCsv(['A'], [[1,2]]));assert.throws(()=>createCsv([], []))
assert.equal(createCsv(['A'], []), '\uFEFF"A"\r\n')
let clicked=0, removed=0, revoked=0, savedBlob, link
const originalCreate=URL.createObjectURL, originalRevoke=URL.revokeObjectURL
URL.createObjectURL=blob=>{savedBlob=blob;return 'blob:test-csv'}
URL.revokeObjectURL=url=>{assert.equal(url,'blob:test-csv');revoked++}
globalThis.document={createElement(tag){assert.equal(tag,'a');link={click(){clicked++},remove(){removed++}};return link},body:{append(){}}}
globalThis.window={setTimeout(fn){fn()}}
downloadCsv('liber/estoque', ['Caixas'], [[53]])
assert.equal(clicked,1);assert.equal(removed,1);assert.equal(revoked,1)
assert.match(link.download,/^liber-estoque-\d{4}-\d{2}-\d{2}\.csv$/)
assert.deepEqual([...new Uint8Array(await savedBlob.arrayBuffer()).slice(0,3)],[239,187,191])
assert.equal(await savedBlob.text(),'"Caixas"\r\n53\r\n') // Blob.text remove o BOM ao decodificar UTF-8.
document.createElement=()=>({click(){throw Error('download indisponível')},remove(){removed++}})
assert.throws(()=>downloadCsv('liber',['A'],[[1]]));assert.equal(removed,2);assert.equal(revoked,2)
URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke
delete globalThis.document;delete globalThis.window
console.log('OK: CSV com acentos, separador, aspas, linhas, decimais, valores vazios, proteção de fórmulas e limpeza do download. Sem rede/banco.')
