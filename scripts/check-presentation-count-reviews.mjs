import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {loadPresentationModule} from './presentation-fixture.mjs'
const {reviewInput,parseCountReview,mergeCountReviews}=await import(await loadPresentationModule('src/lib/presentation-count-reviews.ts'))
const samples=JSON.parse(await readFile('tests/fixtures/presentation-counts.json','utf8'))
const actor='11111111-1111-4111-8111-111111111111'
const count={id:crypto.randomUUID(),actor_id:actor,actor_name:'Pessoa do roteiro',source_id:samples[0].source_id,scenario_key:'liber-presentation-v1',scenario_revision:1,location:'NORTE',submission:structuredClone(samples[0]),state:'awaiting_review',created_at:'2026-11-02T16:00:00Z'}
const request=crypto.randomUUID(),input=reviewInput(count,'approved','  Conferência do roteiro aprovada sem ajuste.  ',request)
assert.equal(input.p_note,'Conferência do roteiro aprovada sem ajuste.')
const unchanged=JSON.stringify(count)
input.p_expected_submission.notes='Cópia isolada'
assert.equal(JSON.stringify(count),unchanged)
assert.throws(()=>reviewInput(count,'approved','curt',request))
const review={id:crypto.randomUUID(),request_id:request,count_id:count.id,reviewer_id:actor,reviewer_name:'Administrador do roteiro',decision:'approved',note:'Conferência do roteiro aprovada sem ajuste.',submission_snapshot:structuredClone(count.submission),reviewed_at:'2026-11-02T16:05:00Z'}
assert.equal(parseCountReview(review,count).decision,'approved')
assert.throws(()=>parseCountReview({...review,count_id:crypto.randomUUID()},count))
assert.throws(()=>parseCountReview({...review,submission_snapshot:{...count.submission,notes:'Outra referência'}},count))
assert.throws(()=>parseCountReview({...review,decision:'adjust_stock'},count))
assert.equal(mergeCountReviews({[count.id]:review},[],[count])[count.id].id,review.id)
assert.throws(()=>mergeCountReviews({[count.id]:review},[{...review,id:crypto.randomUUID(),decision:'recount_requested'}],[count]))
assert.deepEqual(mergeCountReviews({[count.id]:review},[],[]),{})
assert.throws(()=>mergeCountReviews({},[review],[]))
assert.equal(JSON.stringify(count),unchanged)
let plans
try{plans=JSON.parse(await readFile('tests/fixtures/presentation-count-reviews.json','utf8'))}catch{
 plans=[
 {source_id:samples[0].source_id,request_id:crypto.randomUUID(),decision:'recount_requested',note:'Diferença de uma caixa: solicitar nova conferência no roteiro de apresentação.'},
 {source_id:samples[1].source_id,request_id:crypto.randomUUID(),decision:'approved',note:'Conferência aprovada no roteiro de apresentação; excedente mantido para análise, sem ajustar saldo.'},
 ]
 await writeFile('tests/fixtures/presentation-count-reviews.json',JSON.stringify(plans,null,2)+'\n')
}
const literal=JSON.stringify(plans).replaceAll("'","''")
await writeFile('supabase/seeds/presentation-count-reviews.sql',`begin;\nselect set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);\nset local role authenticated;\ndo $$ declare plan jsonb; original public.presentation_shelf_counts;begin\n for plan in select * from jsonb_array_elements('${literal}'::jsonb) loop\n  select * into strict original from public.presentation_shelf_counts where actor_id=auth.uid() and source_id=(plan->>'source_id')::uuid;\n  perform public.review_presentation_count(original.id,original.submission,plan->>'decision',plan->>'note',(plan->>'request_id')::uuid);\n end loop;\nend $$;\nreset role;\ncommit;\nselect decision,count(*) as examples from public.presentation_count_reviews group by decision order by decision;\n`)
console.log('Novos casos de revisão: identidade, cópia congelada, justificativa, referência e preservação de confirmação imutável aprovados; dois exemplos preparados.')
