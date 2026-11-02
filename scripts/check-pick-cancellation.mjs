import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
async function load(file) { return import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText).toString('base64')) }
const m = await load('src/lib/pick-missions.ts'), { demoStock } = await load('src/lib/shelf-capacity.ts')
const state = m.startPickMission(m.parseMissions(null, 'cancel-user'), 'PED-1001', demoStock)
assert.throws(() => m.cancelPickMission(state, 'PED-1001', '   ', false), /motivo/)
assert.throws(() => m.cancelPickMission(state, 'PED-1001', 'a'.repeat(301), false), /motivo/)
const cancelled = m.cancelPickMission(state, 'PED-1001', '  Cliente desistiu  ', false)
assert.equal(cancelled.missions['PED-1001'].cancellation.reason, 'Cliente desistiu')
assert.equal(cancelled.missions['PED-1001'].cancellation.disposition, 'not-picked')
assert.equal(state.missions['PED-1001'].status, 'active')
const step = state.missions['PED-1001'].steps[0]
const partial = m.confirmPick(state, 'PED-1001', step.id, m.pickCode(step), 3)
assert.throws(() => m.cancelPickMission(partial, 'PED-1001', 'Cliente desistiu', false), /retorno/)
const returned = m.cancelPickMission(partial, 'PED-1001', 'Cliente desistiu', true)
assert.equal(returned.missions['PED-1001'].cancellation.disposition, 'returned')
assert.equal(returned.missions['PED-1001'].steps[0].counted, 3)
assert.deepEqual(m.parseMissions(JSON.stringify(returned), 'cancel-user'), returned)
assert.throws(() => m.parseMissions(JSON.stringify(returned).replace('"returned"', '"not-picked"'), 'cancel-user'), /cancelamento/)
assert.throws(() => m.cancelPickMission(returned, 'PED-1001', 'Outro motivo', true), /andamento/)
const legacy = structuredClone(cancelled); delete legacy.missions['PED-1001'].cancellation
assert.equal(m.parseMissions(JSON.stringify(legacy), 'cancel-user').missions['PED-1001'].status, 'cancelled')
console.log('Novas verificações de cancelamento com motivo e retorno aprovadas.')
