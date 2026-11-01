import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const config=JSON.parse(await readFile('vercel.json','utf8'))
const headers=Object.fromEntries(config.headers.find(rule=>rule.source==='/(.*)').headers.map(item=>[item.key.toLowerCase(),item.value]))
assert.equal(headers['x-content-type-options'],'nosniff')
assert.equal(headers['x-frame-options'],'DENY')
assert.equal(headers['content-security-policy'],"frame-ancestors 'none'")
assert.equal(headers['referrer-policy'],'strict-origin-when-cross-origin')
assert.equal(headers['x-robots-tag'],'noindex, nofollow, noarchive')
console.log('5 verificações novas da configuração de cabeçalhos aprovadas; aplicação na hospedagem depende de publicação.')
