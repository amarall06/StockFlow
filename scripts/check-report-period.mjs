import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const source = ts.transpileModule(await readFile('src/lib/report-period.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {reportPeriod: range} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
assert.deepEqual(range('2026-11-01','week'),{start:'2026-10-26T03:00:00.000Z',end:'2026-11-02T03:00:00.000Z',label:'2026-10-26 a 2026-11-01'})
assert.equal(range('2026-11-02','week').label,'2026-11-02 a 2026-11-08')
assert.equal(range('2024-02-29','month').label,'2024-02-01 a 2024-02-29')
assert.equal(range('2026-12-31','year').end,'2027-01-01T03:00:00.000Z')
for (const invalid of ['','2026-02-29','texto']) assert.throws(()=>range(invalid,'month'))
console.log('7 verificações novas de calendário aprovadas.')
