import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/read-all-rows.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { readAllRows } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const rows = Array.from({length: 1205}, (_, id) => ({id, boxes: id+1}))
for (const cap of [1000, 500, 37]) {
  const result = await readAllRows(async (from, to) => ({data: rows.slice(from, Math.min(to+1,from+cap)), error: null}))
  assert.equal(result.error, null)
  assert.deepEqual(result.data, rows)
}
assert.deepEqual(await readAllRows(async () => ({data: [], error: null})), {data: [], error: null})
const failure = new Error('Falha de página intermediária')
const result = await readAllRows(async (from) => from ? {data: null, error: failure} : {data: rows.slice(0,500), error: null})
assert.equal(result.error, failure)
assert.deepEqual(result.data, [], 'Uma falha não pode fornecer estoque parcial como se fosse completo')
assert((await readAllRows(async () => ({data: null, error: null}))).error)
console.log('OK: 1205 registros, limites menores no servidor, vazio e falha sem publicação de dados parciais.')
