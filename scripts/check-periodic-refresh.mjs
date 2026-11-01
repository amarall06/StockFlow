import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/resume-refresh.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const { startResumeRefresh } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const settle = () => new Promise(resolve => setImmediate(resolve))
function environment() {
  const timers = new Map(), intervals = new Map()
  let id = 0
  globalThis.window = Object.assign(new EventTarget(), {
    setTimeout: callback => { timers.set(++id, callback); return id },
    clearTimeout: key => timers.delete(key),
    setInterval: (callback, delay) => { assert.equal(delay, 30000); intervals.set(++id, callback); return id },
    clearInterval: key => intervals.delete(key),
  })
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  return {
    timers, intervals,
    tick: () => { for (const callback of intervals.values()) callback() },
    flush: async () => {
      const callbacks = [...timers.values()]
      timers.clear()
      callbacks.forEach(callback => callback())
      await settle()
    },
  }
}

// O temporizador respeita aba oculta/diálogo, inclusive se aberto durante a leitura.
{
  const env = environment()
  let blocked = false, calls = 0, release
  const applied = []
  const stop = startResumeRefresh({ intervalMs: 30000, canRefresh: () => !blocked,
    load: () => { calls++; return new Promise(resolve => { release = resolve }) },
    apply: value => applied.push(value), onError: () => assert.fail('Falha inesperada'),
  })
  document.visibilityState = 'hidden'
  env.tick()
  assert.equal(env.timers.size, 0)
  document.visibilityState = 'visible'
  blocked = true
  env.tick()
  assert.equal(env.timers.size, 0)
  blocked = false
  env.tick()
  await env.flush()
  assert.equal(calls, 1)
  blocked = true
  release('sob diálogo')
  await settle()
  assert.deepEqual(applied, [])
  blocked = false
  env.tick()
  await env.flush()
  release('consulta nova')
  await settle()
  assert.deepEqual(applied, ['consulta nova'])
  stop()
}

// Vários intervalos durante uma consulta lenta geram só uma próxima leitura.
{
  const env = environment()
  let calls = 0, release
  const stop = startResumeRefresh({ intervalMs: 30000,
    load: () => ++calls === 1 ? new Promise(resolve => { release = resolve }) : Promise.resolve(2),
    apply: () => {}, onError: () => assert.fail('Falha inesperada'),
  })
  env.tick()
  await env.flush()
  env.tick(); env.tick(); env.tick()
  assert.equal(calls, 1)
  assert.equal(env.timers.size, 0)
  release(1)
  await settle()
  assert.equal(env.timers.size, 1)
  await env.flush()
  assert.equal(calls, 2)
  stop()
}

// Sair da tela cancela tanto intervalo quanto leitura periódica agendada.
{
  const env = environment()
  const stop = startResumeRefresh({ intervalMs: 30000,
    load: () => assert.fail('Consulta periódica depois da limpeza'),
    apply: () => assert.fail('Resultado depois da limpeza'), onError: () => assert.fail('Erro depois da limpeza'),
  })
  env.tick()
  assert.equal(env.timers.size, 1)
  stop()
  assert.equal(env.intervals.size, 0)
  assert.equal(env.timers.size, 0)
  env.tick()
  await env.flush()
}
console.log('OK: três casos novos de atualização periódica — pausas, leitura lenta e limpeza. Sem rede/banco.')
