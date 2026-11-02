import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {loadPresentationModule} from './presentation-fixture.mjs'
const {beginShelfCount}=await import(await loadPresentationModule('src/lib/shelf-count.ts'))
const {presentationBundle}=await import(await loadPresentationModule('src/lib/presentation-bundle.ts'))
const {countSubmission,countFingerprint,parseSharedCount}=await import(await loadPresentationModule('src/lib/presentation-counts.ts'))
const actor='11111111-1111-4111-8111-111111111111'
function draft(location){const d=beginShelfCount(`presentation:${actor}`,location,presentationBundle.stock,'2026-11-02T14:30:00Z');d.startedAt='2026-11-02T15:00:00Z';d.rows.forEach(row=>row.counted=row.expected);return d}
const first=draft('NORTE');first.rows[0].counted=19
const payload=countSubmission(first);first.rows[0].counted=18
assert.equal(payload.rows[0].counted,19,'O envio deve ser uma cópia congelada')
assert.equal(countFingerprint(payload),countFingerprint(Object.fromEntries(Object.entries(payload).reverse())),'Ordem das propriedades JSON não muda a identidade do envio')
assert.throws(()=>countSubmission({...first,id:'não-é-uuid'}))
assert.throws(()=>countSubmission({...first,rows:[{...first.rows[0],counted:null},first.rows[1]]}))
const wrong=draft('SUL');wrong.rows[0].expected=99;wrong.reference=JSON.stringify([{code:'MGM-35',status:'Em estoque',boxes:99}]);assert.throws(()=>countSubmission(wrong),/referência/)
const receipt={id:crypto.randomUUID(),actor_id:actor,actor_name:'Conta de exemplo',source_id:payload.source_id,scenario_key:'liber-presentation-v1',scenario_revision:1,location:'NORTE',submission:payload,state:'awaiting_review',created_at:'2026-11-02T15:01:00Z'}
assert.equal(parseSharedCount(receipt).submission.rows[0].counted,19)
assert.throws(()=>parseSharedCount({...receipt,state:'approved'}))
assert.throws(()=>parseSharedCount({...receipt,source_id:crypto.randomUUID()}))
assert.equal(countSubmission(draft('OESTE')).rows.length,0)
let samples
try{samples=JSON.parse(await readFile('tests/fixtures/presentation-counts.json','utf8'))}catch{
 const north=draft('NORTE'),south=draft('SUL'),west=draft('OESTE')
 north.rows[0].counted=19;south.rows[0].counted=13
 for(const d of [north,south,west])d.notes='Contagem do roteiro de apresentação; aguardando revisão.'
 samples=[north,south,west].map(countSubmission)
 await writeFile('tests/fixtures/presentation-counts.json',JSON.stringify(samples,null,2)+'\n')
}
const literal=JSON.stringify(samples).replaceAll("'","''")
await writeFile('supabase/seeds/presentation-shelf-counts.sql',`begin;\nselect set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);\nset local role authenticated;\ndo $$ declare sample jsonb;begin\n for sample in select * from jsonb_array_elements('${literal}'::jsonb) loop\n  perform public.submit_presentation_shelf_count(sample);\n end loop;\nend $$;\nreset role;\ncommit;\nselect count(*) as presentation_count_examples from public.presentation_shelf_counts;\n`)
console.log('Novos casos de envio de contagens: cópia, identidade, referência, completude, confirmação e prateleira vazia aprovados; três exemplos preparados.')
