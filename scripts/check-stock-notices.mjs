import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/stock-notices.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { nextStockNotices: next } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const row = (code, total, minimum = 3) => ({ code, total, minimum, severity: total === 0 ? 'zero' : total <= minimum ? 'low' : 'ok' })
let result = next([row('AGM-35', 3), row('MGM-35', 0)], {})
assert.equal(result.notices.length, 2)
assert.equal(next([row('AGM-35', 3), row('MGM-35', 0)], result.history).notices.length, 0)
assert.deepEqual(next([row('AGM-35', 2)], result.history).notices.map(r => r.code), ['AGM-35'])
assert.equal(next([row('AGM-35', 3, 4)], result.history).notices.length, 1)
result = next([row('AGM-35', 8)], result.history)
assert.deepEqual(result.history, {})
assert.equal(next([row('AGM-35', 3)], result.history).notices.length, 1)
assert.equal(next([], result.history).notices.length, 0)
console.log('7 verificações novas de avisos aprovadas: início, repetição, piora, mínimo, recuperação, nova queda e vazio.')
