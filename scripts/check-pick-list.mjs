import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile('src/lib/pick-list.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText.replace("import('jspdf')", `import(${JSON.stringify(import.meta.resolve('jspdf'))})`)
const { createPickList, createPickListPdf } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const mission = { orderId: 'PED-1001', status: 'active', startedAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:01:00Z', steps: [
  { id: 'a', code: 'AGM-35', location: 'NORTE', status: 'Liberado para venda', quantity: 8, counted: 3 },
  { id: 'b', code: 'MGM-35', location: 'SUL', status: 'Em estoque', quantity: 4, counted: 0 },
] }
const before = JSON.stringify(mission)
const report = createPickList(mission, 'Oficina Horizonte', '2026-11-02T12:02:00Z')
assert.deepEqual(report.rows.map(row => row.slice(10, 13)), [[8, 3, 5], [4, 0, 4]])
assert.equal(report.rows[0][9], 'LIBER|NORTE|AGM-35|LIBERADO')
assert.equal(report.rows[1][9], 'LIBER|SUL|MGM-35|EM_ESTOQUE')
assert.equal(createPickList({ ...mission, status: 'cancelled' }, 'Cliente').status, 'CANCELADA - não utilizar para retirada')
assert.equal(createPickList({ ...mission, status: 'separated' }, 'Cliente').status, 'Separação concluída')
mission.steps[0].counted = 8
assert.equal(report.rows[0][11], 3, 'exportação preserva cópia do momento')
mission.steps[0].counted = 3
assert.equal(JSON.stringify(mission), before, 'geração não altera missão')
const blob = await createPickListPdf(report)
await mkdir('test-results/pick-list-review', { recursive: true })
await writeFile('test-results/pick-list-review/retirada.pdf', Buffer.from(await blob.arrayBuffer()))
console.log('Novas verificações da lista aprovadas; PDF salvo para inspeção visual.')
