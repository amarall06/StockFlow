import { test, expect, type Page, type WebSocketRoute, type Request } from '@playwright/test'
import { prepareKeyboardPage, openModule } from './helpers/keyboard'

async function transport(page: Page, denied = false) {
  const peers: { socket: WebSocketRoute; topic: string; join: string | null }[] = []
  const privateJoins: boolean[] = []
  await page.routeWebSocket('wss://stockflow-test.supabase.co/realtime/v1/websocket*', socket => {
    socket.onMessage(raw => {
      if (typeof raw !== 'string') throw new Error('O cliente não deve enviar dados binários neste receptor.')
      const [join, ref, topic, event, payload] = JSON.parse(raw)
      if (event === 'phx_join') {
        privateJoins.push(payload.config.private === true)
        if (!denied) peers.push({ socket, topic, join })
        socket.send(JSON.stringify([join, ref, topic, 'phx_reply', denied ? { status: 'error', response: { reason: 'Canal privado recusado no teste' } } : { status: 'ok', response: {} }]))
      } else if (event === 'heartbeat' || event === 'phx_leave') {
        socket.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: {} }]))
      } else if (event !== 'access_token') throw new Error(`Envio inesperado no receptor: ${event}`)
    })
  })
  return { peers, privateJoins, emit: () => peers.forEach(({ socket, topic, join }) => socket.send(JSON.stringify([join, null, topic, 'broadcast', { event: 'inventory_changed', payload: { quantity: 999999 }, type: 'broadcast' }]))) }
}
async function consumer(page: Page, denied = false) {
  await page.clock.install()
  await page.addInitScript(() => {
    const state = window as Window & { realtimeNotices: number }
    state.realtimeNotices = 0
    window.addEventListener('liber:inventory-change', () => { state.realtimeNotices++ })
  })
  const pendingReads = new Set<Request>()
  page.on('request', request => { if (request.url().includes('/rest/v1/')) pendingReads.add(request) })
  page.on('requestfinished', request => { pendingReads.delete(request) })
  page.on('requestfailed', request => { pendingReads.delete(request) })
  const server = await transport(page, denied)
  const writes = await prepareKeyboardPage(page)
  await expect.poll(() => server.privateJoins.length).toBeGreaterThan(0)
  if (!denied) await expect.poll(() => page.evaluate(() => (window as Window & { realtimeNotices: number }).realtimeNotices)).toBeGreaterThan(0)
  await page.clock.runFor(500)
  await expect.poll(() => pendingReads.size).toBe(0)
  await page.clock.runFor(200)
  let queries = 0
  const stock = { shocks: 3, springs: 2 }
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_balances*', async route => {
    if (Number(new URL(route.request().url()).searchParams.get('offset')) > 0) return route.fulfill({ json: [] })
    queries++
    return route.fulfill({ json: [{ product_id: 'p1', location_id: 'l1', status_code: 'awaiting_test', quantity: stock.shocks }, { product_id: 'p2', location_id: 'l1', status_code: 'in_stock', quantity: stock.springs }] })
  })
  return { server, writes, stock, queries: () => queries }
}
const total = (page: Page) => page.locator('.dashboard-stock-totals .dashboard-stat-total strong')

test('aviso privado atualiza dois clientes isolados antes do intervalo sem aplicar o payload', async ({ page, browser }) => {
  const first = await consumer(page)
  const otherContext = await browser.newContext({ baseURL: new URL(page.url()).origin })
  try {
    const other = await otherContext.newPage()
    const second = await consumer(other)
    await expect(total(page)).toHaveText('5 caixas')
    await expect(total(other)).toHaveText('5 caixas')
    const beforeFirst = first.queries(), beforeSecond = second.queries()
    first.stock.shocks = second.stock.shocks = 7
    first.stock.springs = second.stock.springs = 4
    for (let i = 0; i < 3; i++) { first.server.emit(); second.server.emit() }
    await page.clock.runFor(500)
    await other.clock.runFor(500)
    await expect(total(page)).toHaveText('11 caixas')
    await expect(total(other)).toHaveText('11 caixas')
    // A troca de janelas também pode gerar uma leitura por foco; o aviso deve
    // produzir uma nova leitura sem depender de chegar ao intervalo de 30 s.
    expect(first.queries()).toBeGreaterThan(beforeFirst)
    expect(second.queries()).toBeGreaterThan(beforeSecond)
    expect(first.server.privateJoins.every(Boolean)).toBe(true)
    expect(second.server.privateJoins.every(Boolean)).toBe(true)
    expect(first.writes).toEqual([])
    expect(second.writes).toEqual([])
  } finally { await otherContext.close() }
})

test('aviso Realtime não consulta nem altera rascunho em formulário operacional', async ({ page }) => {
  const current = await consumer(page)
  await openModule(page, 'Visão geral')
  const code = page.locator('.receipt-form').getByLabel('Código do produto', { exact: true })
  await code.fill('AGM-35')
  current.server.emit()
  await page.clock.runFor(500)
  expect(current.queries()).toBe(0)
  await expect(code).toHaveValue('AGM-35')
  expect(current.writes).toEqual([])
})

test('canal privado recusado conserva a atualização periódica de segurança', async ({ page }) => {
  const current = await consumer(page, true)
  await expect(total(page)).toHaveText('5 caixas')
  current.stock.shocks = 7
  current.stock.springs = 4
  await page.clock.fastForward(30_000)
  await page.clock.runFor(500)
  await expect(total(page)).toHaveText('11 caixas')
  expect(current.server.privateJoins.every(Boolean)).toBe(true)
  expect(current.writes).toEqual([])
})
