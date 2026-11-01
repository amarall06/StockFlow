import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/inventory-realtime.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { startInventoryRealtime } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const settle = () => new Promise(resolve => setImmediate(resolve))
function fakeClient() {
  const channels = [], removed = []
  let remove = () => Promise.resolve('ok')
  const client = {
    channel(topic, options) {
      const channel = { topic, options, event: null, status: null,
        on(type, filter, callback) { assert.equal(type, 'broadcast'); assert.deepEqual(filter, { event: 'inventory_changed' }); this.event = callback; return this },
        subscribe(callback) { this.status = callback; return this },
      }
      channels.push(channel)
      return channel
    },
    removeChannel(channel) { removed.push(channel); return remove() },
  }
  return { client, channels, removed, setRemove: callback => { remove = callback } }
}

// Canal privado e aviso sem aplicar conteúdo do payload.
{
  const f = fakeClient(), changes = []
  const stop = startInventoryRealtime(f.client, (...args) => changes.push(args))
  await settle()
  assert.equal(f.channels.length, 1)
  assert.equal(f.channels[0].topic, 'inventory:changes')
  assert.deepEqual(f.channels[0].options, { config: { private: true } })
  f.channels[0].event({ payload: { quantity: 999999 } })
  assert.deepEqual(changes, [[]])
  stop(); await settle()
}

// Assinar e reassinar invalida as consultas; falhas não publicam dados.
{
  const f = fakeClient(); let changes = 0
  const stop = startInventoryRealtime(f.client, () => changes++)
  await settle()
  const channel = f.channels[0]
  channel.status('SUBSCRIBED')
  channel.status('CHANNEL_ERROR'); channel.status('TIMED_OUT'); channel.status('CLOSED')
  assert.equal(changes, 1)
  channel.status('SUBSCRIBED')
  assert.equal(changes, 2)
  stop(); await settle()
}

// Callbacks atrasados da conta anterior são ignorados.
{
  const f = fakeClient(); let changes = 0
  const stop = startInventoryRealtime(f.client, () => changes++)
  await settle()
  const channel = f.channels[0]
  stop(); await settle()
  channel.event({}); channel.status('SUBSCRIBED')
  assert.equal(changes, 0)
  assert.deepEqual(f.removed, [channel])
}

// Montar/desmontar antes do microtask não deixa canal órfão (StrictMode).
{
  const f = fakeClient()
  const stopFirst = startInventoryRealtime(f.client, () => assert.fail('Aviso da montagem descartada'))
  stopFirst()
  const stopSecond = startInventoryRealtime(f.client, () => {})
  await settle()
  assert.equal(f.channels.length, 1)
  stopSecond(); await settle()
  assert.equal(f.removed.length, 1)
}

// Próxima assinatura espera a remoção anterior antes de usar o mesmo tópico.
{
  const f = fakeClient(); let release
  f.setRemove(() => new Promise(resolve => { release = resolve }))
  const stopFirst = startInventoryRealtime(f.client, () => {})
  await settle()
  stopFirst()
  const stopSecond = startInventoryRealtime(f.client, () => {})
  await settle()
  assert.equal(f.channels.length, 1)
  release('ok'); await settle()
  assert.equal(f.channels.length, 2)
  f.setRemove(() => Promise.resolve('ok'))
  stopSecond(); await settle()
}

// Erro de conexão e de limpeza não interrompe os demais mecanismos.
{
  const bad = { channel() { throw new Error('Sem canal') }, removeChannel() { return Promise.resolve('error') } }
  const stopBad = startInventoryRealtime(bad, () => assert.fail('Aviso indevido'))
  await settle(); stopBad(); await settle()
  const f = fakeClient()
  f.setRemove(() => Promise.reject(new Error('Sem conexão')))
  const stop = startInventoryRealtime(f.client, () => {})
  await settle(); stop(); await settle()
}
console.log('OK: seis casos novos do receptor privado — avisos, reconexão, conta, StrictMode e limpeza. Sem rede/banco.')
