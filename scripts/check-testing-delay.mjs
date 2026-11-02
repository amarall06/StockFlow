import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = ts.transpileModule(await readFile('src/lib/testing-delay.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const m = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const before = JSON.stringify(m.sampleTestingGroups)
const sum = (rows, status) => rows.filter(row => row.situation === status).reduce((s, r) => s + r.boxes, 0)
assert.equal(sum(m.testingDelays(m.sampleTestingGroups, 7, m.testingReference), 'overdue'), 10)
assert.equal(sum(m.testingDelays(m.sampleTestingGroups, 14, m.testingReference), 'overdue'), 3)
assert.equal(sum(m.testingDelays(m.sampleTestingGroups, 30, m.testingReference), 'unknown'), 2)
const group = m.sampleTestingGroups[0]
assert.equal(m.testingDelays([group], 2, m.testingReference)[0].situation, 'within')
assert.equal(m.testingDelays([{ ...group, since: '2026-11-03' }], 2, m.testingReference)[0].situation, 'future')
assert.equal(m.testingDelays([{ ...group, kind: 'spring' }, { ...group, id: 'released', awaiting: false }], 2, m.testingReference).length, 0)
for (const date of ['2026-02-30', '2026-13-02', 'invalid']) assert.throws(() => m.testingDelays([{ ...group, since: date }], 7, m.testingReference), /Data/)
for (const value of [0, -1, 1.5, 3651, NaN]) assert.throws(() => m.validateTestingDays(value))
assert.equal(JSON.stringify(m.sampleTestingGroups), before)
const data = new Map(); globalThis.window = new EventTarget(); globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
let notices = 0; const stop = m.subscribeTestingDays(() => notices++)
m.saveTestingDays('a', 14, null)
assert.equal(m.parseTestingDays(m.readTestingDays('a'), 'a'), 14)
assert.equal(m.parseTestingDays(m.readTestingDays('b'), 'b'), 7)
assert.throws(() => m.parseTestingDays(m.readTestingDays('a'), 'b'))
assert.throws(() => m.saveTestingDays('a', 30, null), /outra aba/)
assert.equal(notices, 1); stop(); window.dispatchEvent(new Event('liber:testing-delay')); assert.equal(notices, 1)
const raw = m.readTestingDays('a'); localStorage.setItem = () => { throw Error('quota') }
assert.throws(() => m.saveTestingDays('a', 30, raw), /quota/)
assert.equal(m.readTestingDays('a'), raw)
console.log('Novas verificações do prazo de testagem aprovadas.')
