import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
import ts from 'typescript'

const origin = 'https://storage-test.invalid'
const bucket = 'product-photos'
const code = 'TST-1'
const filename = code + '.webp'
const objectPath = '/storage/v1/object/' + bucket + '/' + filename
const signedPath = '/storage/v1/object/sign/' + bucket + '/' + filename
const fixture = (name) => readFile(new URL('../public/images/' + name, import.meta.url))
const original = await fixture('shock-example-thumb.webp')
const replacement = await fixture('spring-example-thumb.webp')
assert.notDeepEqual(original, replacement)

let saved
let revision = 0
const operations = []
const client = createClient(origin, 'test-key', {
  auth: {autoRefreshToken: false, persistSession: false, detectSessionInUrl: false},
  global: {fetch: async (input, init) => {
    const request = new Request(input, init)
    const {pathname} = new URL(request.url)
    assert.equal(new URL(request.url).origin, origin)
    if (request.method === 'POST' && pathname === objectPath) {
      assert.equal(request.headers.get('x-upsert'), 'true')
      const file = (await request.formData()).get('')
      assert.equal(file.type, 'image/webp')
      operations.push(saved ? 'substituir' : 'enviar')
      saved = Buffer.from(await file.arrayBuffer())
      revision++
      return Response.json({Key: bucket + '/' + filename})
    }
    if (request.method === 'POST' && pathname === '/storage/v1/object/list/' + bucket) {
      assert.equal((await request.json()).prefix, '')
      return Response.json(saved ? [{name: filename, updated_at: String(revision)}] : [])
    }
    if (request.method === 'POST' && pathname === '/storage/v1/object/sign/' + bucket) {
      assert.deepEqual(await request.json(), {paths: [filename], expiresIn: 300})
      return Response.json([{path: filename, signedURL: '/object/sign/' + bucket + '/' + filename + '?token=test'}])
    }
    if (request.method === 'GET' && pathname === signedPath) {
      operations.push('ler')
      return new Response(saved, {headers: {'content-type': 'image/webp'}})
    }
    throw new Error('Requisição inesperada: ' + request.method + ' ' + pathname)
  }},
})

const source = await readFile(new URL('../src/lib/product-photos.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(
  source.replace("import {supabase} from './supabase'", ''),
  {compilerOptions: {target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext}},
).outputText
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(
  'const supabase = globalThis.__productPhotoApiTestClient;\n' + compiled,
).toString('base64')
globalThis.__productPhotoApiTestClient = client
const {saveProductPhoto, loadProductPhotos} = await import(moduleUrl)
delete globalThis.__productPhotoApiTestClient

assert.deepEqual(await loadProductPhotos(), {})
async function saveAndRead(bytes) {
  await saveProductPhoto(code, new Blob([bytes], {type: 'image/webp'}))
  const photos = await loadProductPhotos()
  assert.deepEqual(Object.keys(photos), [code])
  const {url} = photos[code]
  const response = await client.rest.fetch(url)
  assert.equal(response.headers.get('content-type'), 'image/webp')
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
  return url
}

assert.notEqual(await saveAndRead(original), await saveAndRead(replacement))
assert.deepEqual(operations, ['enviar', 'ler', 'substituir', 'ler'])
console.log('OK: SDK real enviou, listou, assinou, leu e substituiu WebP com transporte HTTP simulado.')
