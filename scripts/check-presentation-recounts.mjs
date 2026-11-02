import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {loadPresentationModule} from './presentation-fixture.mjs'
const {beginPresentationRecount,mergeRecountLinks}=await import(await loadPresentationModule('src/lib/presentation-recounts.ts'))
const {countSubmission,parseSharedCount}=await import(await loadPresentationModule('src/lib/presentation-counts.ts'))
const {parseShelfCount}=await import(await loadPresentationModule('src/lib/shelf-count.ts'))
const samples=JSON.parse(await readFile('tests/fixtures/presentation-counts.json','utf8')),actor='11111111-1111-4111-8111-111111111111'
const parent={id:crypto.randomUUID(),actor_id:actor,actor_name:'Conta do roteiro',source_id:samples[0].source_id,scenario_key:'liber-presentation-v1',scenario_revision:1,location:'NORTE',submission:samples[0],state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}
const review={id:crypto.randomUUID(),request_id:crypto.randomUUID(),count_id:parent.id,reviewer_id:actor,reviewer_name:'Administrador do roteiro',decision:'recount_requested',note:'Conferir novamente a quantidade.',submission_snapshot:structuredClone(parent.submission),reviewed_at:'2026-11-02T16:05:00Z'}
const before=JSON.stringify(parent),draft=beginPresentationRecount(`presentation:${actor}`,parent,review,null,'2026-11-02T16:10:00Z')
assert.equal(draft.recountOf,parent.id);assert.notEqual(draft.id,parent.source_id);assert(draft.rows.every(row=>row.counted===null));assert.equal(JSON.stringify(parent),before)
assert.throws(()=>beginPresentationRecount(draft.userId,parent,review,draft,draft.consultedAt),/rascunho/)
assert.throws(()=>beginPresentationRecount(draft.userId,parent,{...review,decision:'approved'},null,draft.consultedAt))
assert.equal(parseShelfCount(JSON.stringify(draft),draft.userId).recountOf,parent.id)
draft.rows.forEach(row=>row.counted=row.expected)
const submission=countSubmission(draft);assert.equal(submission.recount_of,parent.id)
const child=parseSharedCount({...parent,id:crypto.randomUUID(),source_id:draft.id,submission})
const link={parent_count_id:parent.id,child_count_id:child.id,parent_review_id:review.id,created_by:actor,created_at:'2026-11-02T16:11:00Z'}
assert.equal(mergeRecountLinks([], [link,structuredClone(link)],[parent,child]).length,1)
assert.equal(mergeRecountLinks([link],[],[parent,child]).length,1)
assert.throws(()=>mergeRecountLinks([],[],[child]),/sem o vínculo/)
assert.throws(()=>mergeRecountLinks([link],[{...link,child_count_id:crypto.randomUUID()}],[parent,child]))
assert.throws(()=>mergeRecountLinks([], [{...link,created_by:crypto.randomUUID()}],[parent,child]))
const grandchild={...child,id:crypto.randomUUID(),submission:{...child.submission,recount_of:child.id}},next={...link,parent_count_id:child.id,child_count_id:grandchild.id,parent_review_id:crypto.randomUUID()}
assert.equal(mergeRecountLinks([link],[next],[parent,child,grandchild]).length,2)
assert.throws(()=>mergeRecountLinks([], [{...link,child_count_id:parent.id}],[parent]))
let sample
try{sample=JSON.parse(await readFile('tests/fixtures/presentation-recount.json','utf8'))}catch{
 sample={parent_source_id:samples[0].source_id,submission:{...samples[0],source_id:crypto.randomUUID(),rows:samples[0].rows.map(row=>({...row,counted:row.expected})),notes:'Nova conferência do roteiro vinculada à contagem original.',consulted_at:'2026-11-02T16:10:00Z',started_at:'2026-11-02T16:15:00Z'}}
 await writeFile('tests/fixtures/presentation-recount.json',JSON.stringify(sample,null,2)+'\n')
}
const payload=JSON.stringify(sample.submission).replaceAll("'","''")
await writeFile('supabase/seeds/presentation-recount.sql',`begin;\nselect set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);\nset local role authenticated;\ndo $$ declare parent public.presentation_shelf_counts;begin\n select * into strict parent from public.presentation_shelf_counts where actor_id=auth.uid() and source_id='${sample.parent_source_id}'::uuid;\n perform public.submit_presentation_shelf_count(jsonb_set('${payload}'::jsonb,'{recount_of}',to_jsonb(parent.id::text)));\nend $$;\nreset role;\ncommit;\nselect count(*) as recount_links from public.presentation_recount_links;\n`)
console.log('Novos casos de origem, rascunho preservado, campos em branco, recuperação de vínculo e sequência de recontagens aprovados; exemplo preparado.')
