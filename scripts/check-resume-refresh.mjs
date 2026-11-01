import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/resume-refresh.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { startResumeRefresh } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const settle = () => new Promise(resolve => setImmediate(resolve))
function environment() {
  const timers = new Map()
  let id = 0
  globalThis.window = Object.assign(new EventTarget(), {
    setTimeout: callback => { timers.set(++id, callback); return id },
    clearTimeout: key => timers.delete(key),
  })
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  return {
    timers,
    flush: async () => {
      const callbacks = [...timers.values()]
      timers.clear()
      callbacks.forEach(callback => callback())
      await settle()
    },
  }
}

// Eventos durante uma consulta aguardam a conclusão, sem consultas simultâneas.
{
  const env = environment()
  let release
  let calls = 0
  const applied = []
  const stop = startResumeRefresh({
    load: () => ++calls === 1 ? new Promise(resolve => { release = resolve }) : Promise.resolve(2),
    apply: value => applied.push(value), onError: () => assert.fail('Falha inesperada'),
  })
  window.dispatchEvent(new Event('focus'))
  await env.flush()
  window.dispatchEvent(new Event('online'))
  window.dispatchEvent(new Event('focus'))
  assert.equal(calls, 1)
  assert.equal(env.timers.size, 0)
  release(1)
  await settle()
  assert.deepEqual(applied, [1])
  assert.equal(env.timers.size, 1)
  await env.flush()
  assert.equal(calls, 2)
  assert.deepEqual(applied, [1, 2])
  stop()
}

// Trocar de tela/conta remove os eventos e descarta uma resposta tardia.
{
  const env = environment()
  let release
  const stop = startResumeRefresh({
    load: () => new Promise(resolve => { release = resolve }),
    apply: () => assert.fail('Resposta aplicada depois da limpeza'),
    onError: () => assert.fail('Erro aplicado depois da limpeza'),
  })
  window.dispatchEvent(new Event('focus'))
  await env.flush()
  stop()
  release('atrasada')
  await settle()
  window.dispatchEvent(new Event('online'))
  document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(env.timers.size, 0)
}

// Aba oculta não consulta nem publica uma resposta; a volta faz consulta nova.
{
  const env = environment()
  let release
  const applied = []
  const stop = startResumeRefresh({
    load: () => new Promise(resolve => { release = resolve }),
    apply: value => applied.push(value), onError: () => assert.fail('Falha inesperada'),
  })
  document.visibilityState = 'hidden'
  window.dispatchEvent(new Event('online'))
  assert.equal(env.timers.size, 0)
  document.visibilityState = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  await env.flush()
  document.visibilityState = 'hidden'
  release('oculta')
  await settle()
  assert.deepEqual(applied, [])
  document.visibilityState = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  await env.flush()
  release('nova')
  await settle()
  assert.deepEqual(applied, ['nova'])
  stop()
}
console.log('OK: três casos novos — fila sem sobreposição, descarte após limpeza e aba oculta. Sem rede ou banco.')
