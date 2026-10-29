import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const root=new URL('../',import.meta.url)
const compile=(source,jsx)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx}}).outputText
const importSource=(source)=>import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const calls=[]
let listError=false,signError=false,uploadError=false
globalThis.__photoClient={storage:{from(bucket){
  assert.equal(bucket,'product-photos')
  return {
    async list(_prefix,options){calls.push(['list',options.offset]);return {data:Array.from({length:101},(_,i)=>({name:i<100?`AGM-${i+1}.webp`:'MGM-1.webp',updated_at:'2026-10-25T20:00:00Z'})).slice(options.offset,options.offset+100),error:listError?new Error('Sem acesso'):null}},
    async createSignedUrls(paths,ttl){calls.push(['sign',paths.length,ttl]);return {data:paths.map((path)=>({path,signedUrl:`https://storage.example/${path}?token=demo`,error:signError?'Sem acesso':null})),error:null}},
    async upload(path,blob,options){calls.push(['upload',path,blob.size,options]);return {error:uploadError?new Error('Sem permissão'):null}},
  }
}}}
let source=await readFile(new URL('src/lib/product-photos.ts',root),'utf8')
source=source.replace("import {supabase} from './supabase'",'const supabase=globalThis.__photoClient')
const api=await importSource(compile(source))
assert.equal(api.photoObjectName('MGM-100'),'MGM-100.webp')
for(const code of ['AVW-04','AFI-35ABS','AJE-02D'])assert.equal(api.photoObjectName(code),code+'.webp')
for(const code of ['AGM-0','AGM-001','AGM-101','../AGM-1','agm-1'])assert.throws(()=>api.photoObjectName(code))
const png=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'foto.png',{type:'image/png'})
await api.validatePhoto(png)
await assert.rejects(api.validatePhoto(new File(['<svg/>'],'foto.svg',{type:'image/svg+xml'})),/JPG, PNG ou WebP/)
await assert.rejects(api.validatePhoto(new File(['qualquer texto'],'foto.jpg',{type:'image/jpeg'})),/válida/)
await assert.rejects(api.validatePhoto(new File([new Uint8Array(api.MAX_SOURCE_BYTES+1)],'grande.png',{type:'image/png'})),/8 MB/)
const photos=await api.loadProductPhotos()
assert.equal(Object.keys(photos).length,101)
assert.deepEqual(calls.filter(([type])=>type==='list'),[['list',0],['list',100]])
assert.deepEqual(calls.filter(([type])=>type==='sign'),[['sign',100,300],['sign',1,300]])
assert(photos['MGM-1'].url.includes('&v=2026-10-25T20%3A00%3A00Z'))
await api.saveProductPhoto('AGM-1',new Blob(['webp'],{type:'image/webp'}))
assert.deepEqual(calls.at(-1),['upload','AGM-1.webp',4,{contentType:'image/webp',cacheControl:'0',upsert:true}])
await assert.rejects(api.saveProductPhoto('AGM-1',new Blob(['x'],{type:'image/svg+xml'})),/não é válida/)
uploadError=true
await assert.rejects(api.saveProductPhoto('MGM-1',new Blob(['webp'],{type:'image/webp'})),/Administrador/)
listError=true
await assert.rejects(api.loadProductPhotos(),/Sem acesso/)
listError=false;signError=true
await assert.rejects(api.loadProductPhotos(),/consultar as fotos/)

globalThis.__photoApi=api
source=await readFile(new URL('src/components/ProductPhotos.tsx',root),'utf8')
source=source.replace("import {isSpringCode} from '../lib/product-category'","const isSpringCode=(code)=>code.startsWith('M')")
source=source.replace(/^import .*from '\.\.\/lib\/product-photos'$/m,'const {loadProductPhotos,preparePhoto,saveProductPhoto}=globalThis.__photoApi').replace("import './ProductPhotos.css'",'')
source=compile(source,ts.JsxEmit.ReactJSX).replaceAll('from "react/jsx-runtime"',`from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`).replaceAll("from 'react'",`from ${JSON.stringify(import.meta.resolve('react'))}`)
const {ProductPhoto}=await importSource(source)
for(const [code,file] of [['AGM-35','shock-example-thumb.webp'],['MGM-35','spring-example-thumb.webp']]){
  const markup=renderToStaticMarkup(React.createElement(ProductPhoto,{code}))
  assert(markup.includes(file));assert(markup.includes('exemplo ilustrativo'));assert(markup.includes('type="button"'));assert(markup.includes('Exemplo'))
}
delete globalThis.__photoClient;delete globalThis.__photoApi
console.log('OK: arquivos inválidos/grandes, códigos, paginação, links privados, substituição, falhas de acesso e exemplos distintos. Regras SQL e upload real exigem ativação e ensaio no Supabase.')
