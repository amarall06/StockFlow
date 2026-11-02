import assert from 'node:assert/strict'
import {presentationModule,writePresentationFixture} from './presentation-fixture.mjs'
const fixture=await writePresentationFixture(),m=await presentationModule()
const reversed=value=>Array.isArray(value)?value.map(reversed):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reversed(item)])):value
const loaded=m.parsePublishedPresentation(reversed(fixture))
assert.deepEqual(loaded.payload,m.presentationBundle,'ordem de chaves do JSONB não altera o cenário')
assert.notEqual(loaded.payload,m.presentationBundle,'recuperação devolve cópia independente')
assert.equal(loaded.payload.stock.reduce((total,row)=>total+row.boxes,0),85)
assert.equal(loaded.payload.locations.length,4)
assert.equal(loaded.payload.orders.length,3)
assert.equal(loaded.payload.postalReturns.length,3)
for(const bad of [null,{...fixture,revision:2},{...fixture,scenario_key:'other'},{...fixture,published_at:'invalid'},{...fixture,payload:{...fixture.payload,stock:[]}}])assert.throws(()=>m.parsePublishedPresentation(bad))
loaded.payload.stock[0].boxes=999
assert.equal(m.presentationBundle.stock[0].boxes,20)
console.log('Novas verificações do cenário compartilhado aprovadas; semente e fixture geradas.')
