import assert from 'node:assert/strict'
import {loadPresentationModule} from './presentation-fixture.mjs'
const m=await import(await loadPresentationModule('src/lib/shared-layout.ts'))
const {readFile}=await import('node:fs/promises')
const fixture=JSON.parse(await readFile('tests/fixtures/presentation-scenario.json','utf8'))
const row={scenario_key:fixture.scenario_key,revision:1,layout:fixture.payload.floorPlan,capacities:fixture.payload.capacities,updated_at:fixture.published_at,updated_by:null}
const snapshot=m.parseSharedLayout(row)
const draft=structuredClone(snapshot);draft.layout.NORTE.x=20;draft.capacities.NORTE.boxes=55
assert.equal(m.validateSharedDraft(draft).capacities.NORTE.boxes,55)
assert.equal(snapshot.capacities.NORTE.boxes,40)
assert.throws(()=>m.validateSharedDraft({...draft,revision:0}))
assert.throws(()=>m.validateSharedDraft({...draft,layout:{...draft.layout,NORTE:draft.layout.LESTE}}),/sobrepostas/)
assert.throws(()=>m.validateSharedDraft({...draft,capacities:{...draft.capacities,NORTE:{boxes:0,basis:'Caixa'}}}))
assert.throws(()=>m.validateSharedDraft({...draft,capacities:{...draft.capacities,OTHER:{boxes:1,basis:'Caixa'}}}))
assert.throws(()=>m.parseSharedLayout({...row,updated_by:'invalid'}))
assert.throws(()=>m.parseSharedLayout({...row,scenario_key:'other'}))
const newer={...snapshot,revision:3}
assert.equal(m.newestSharedLayout(newer,snapshot),newer)
assert.equal(m.newestSharedLayout(snapshot,newer),newer)
assert.equal(m.newestSharedLayout(null,newer),newer)
console.log('Novas verificações do modelo de sincronização aprovadas.')
