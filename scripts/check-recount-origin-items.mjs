import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {loadPresentationModule} from './presentation-fixture.mjs'
const {beginPresentationRecount}=await import(await loadPresentationModule('src/lib/presentation-recounts.ts'))
const samples=JSON.parse(await readFile('tests/fixtures/presentation-counts.json','utf8')),actor='11111111-1111-4111-8111-111111111111'
const submission=structuredClone(samples[0]);submission.rows.push({code:'MGM-35',status:'Em estoque',expected:0,counted:1})
const parent={id:crypto.randomUUID(),actor_id:actor,actor_name:'Conta do roteiro',source_id:submission.source_id,scenario_key:'liber-presentation-v1',scenario_revision:1,location:'NORTE',submission,state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}
const review={id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:parent.id,reviewer_id:actor,reviewer_name:'Administrador',decision:'recount_requested',note:'Conferir os itens encontrados.',submission_snapshot:structuredClone(submission),reviewed_at:'2026-11-02T16:05:00Z'}
const draft=beginPresentationRecount(`presentation:${actor}`,parent,review,null,'2026-11-02T16:10:00Z')
assert.deepEqual(draft.rows.find(row=>row.code==='MGM-35'),{code:'MGM-35',status:'Em estoque',expected:0,counted:null})
assert.equal(parent.submission.rows.at(-1).counted,1)
console.log('Novo caso: item encontrado sem saldo é preservado para conferência explícita na recontagem.')
