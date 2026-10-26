import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const root=new URL('../dist/',import.meta.url)
const manifest=JSON.parse(await readFile(new URL('.vite/manifest.json',root),'utf8'))
const entry=Object.entries(manifest).find(([,item])=>item.isEntry)
assert(entry,'Execute npm run build antes desta conferência.')
const eager=new Set()
function visit(key){if(eager.has(key))return;eager.add(key);for(const dependency of manifest[key].imports??[])visit(dependency)}
visit(entry[0])
for(const [key,item] of Object.entries(manifest)){
  if(/InventoryApp|InventoryTurnover|StockOutflows|WarrantyManufacturers|ProductCatalog|MovementHistory/.test(key)){
    assert(!eager.has(key),`${key} foi incluído no carregamento inicial do login`)
    assert(item.isDynamicEntry,`${key} deve ser carregado sob demanda`)
  }
}
let bytes=0,gzip=0
for(const key of eager){const buffer=await readFile(new URL(manifest[key].file,root));bytes+=buffer.length;gzip+=gzipSync(buffer).length}
assert(bytes<500000,'JavaScript inicial excedeu o orçamento de 500 KB')
const images={}
for(const kind of ['shock','spring'])for(const suffix of ['-thumb','']){
  const name=`images/${kind}-example${suffix}.webp`
  images[name]=(await stat(new URL(name,root))).size
  assert(images[name]<(suffix?3000:50000),`Imagem maior que o orçamento: ${name}`)
}
console.log(JSON.stringify({scope:'Grafo real do build; não mede tempo de rede/aparelho',initialJavascriptBytes:bytes,initialGzipBytes:gzip,previousSingleJavascriptBytes:582690,reductionPercent:+((1-bytes/582690)*100).toFixed(1),images},null,2))
