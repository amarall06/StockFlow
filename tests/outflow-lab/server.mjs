// Servidor de laboratório: tudo vive em memória. Não importa Supabase ou .env.
import { randomUUID } from 'node:crypto'

export function createOutflowLab() {
  let balances, events, attempts, restored
  function reset() {
    balances = { 'AGM-35': 2, 'MGM-35': 2 }
    events = new Map()
    attempts = []
    restored = new Set()
  }
  reset()
  const state = () => ({ balances: { ...balances }, events: [...events.values()], attempts: [...attempts] })
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(value))
  }
  return {
    state,
    async middleware(req, res, next) {
      const path = req.url?.split('?')[0]
      if (!path?.startsWith('/__outflow_lab/')) return next()
      if (path === '/__outflow_lab/state' && req.method === 'GET') return json(res, 200, state())
      // O laboratório só aceita escrita da própria página local.
      if (req.method !== 'POST' || req.headers.origin !== `http://${req.headers.host}` || req.headers['content-type'] !== 'application/json') {
        return json(res, 403, { error: 'Requisição fora do laboratório.' })
      }
      try {
        let body = ''
        for await (const chunk of req) {
          body += chunk
          if (Buffer.byteLength(body) > 16384) return json(res, 413, { error: 'Corpo muito grande.' })
        }
        if (path === '/__outflow_lab/reset') { reset(); return json(res, 200, state()) }
        if (path === '/__outflow_lab/resume') {
          const { code } = JSON.parse(body)
          if (!Object.hasOwn(balances,code)) return json(res,400,{error:'Categoria inválida.'})
          restored.add(code)
          return json(res,200,{restored:code})
        }
        if (path !== '/__outflow_lab/rpc') return json(res, 404, { error: 'Rota ausente.' })
        const { functionName, payload: p } = JSON.parse(body)
        if (functionName !== 'register_stock_outflow' || !p || !Object.hasOwn(balances, p.p_code)
          || p.p_location !== 'LAB' || p.p_status !== (p.p_code === 'MGM-35' ? 'in_stock' : 'released_for_sale')
          || p.p_reason !== 'sale' || !Number.isInteger(p.p_boxes) || p.p_boxes < 1
          || !/^[a-f0-9-]{36}$/i.test(p.p_request_id ?? '')) {
          return json(res, 400, { data: null, error: { code: '22023' } })
        }
        const fingerprint = JSON.stringify([p.p_code,p.p_location,p.p_status,p.p_boxes,p.p_reason,p.p_notes,p.p_reference])
        const existing = events.get(p.p_request_id)
        attempts.push({ requestId: p.p_request_id, code: p.p_code, boxes: p.p_boxes, repeated: Boolean(existing) })
        if (existing) {
          if (existing.fingerprint !== fingerprint) return json(res, 400, { data: null, error: { code: '22023' } })
          if (!restored.has(p.p_code)) { attempts.at(-1).responseLost=true; res.destroy(); return }
          return json(res, 200, { data: { id: existing.id }, error: null })
        }
        if (balances[p.p_code] < p.p_boxes) return json(res, 409, { data: null, error: { code: 'P0001' } })
        // Este é o COMMIT simulado em memória, antes de cortar a conexão HTTP real.
        balances[p.p_code] -= p.p_boxes
        const saved = { id: randomUUID(), requestId: p.p_request_id, code: p.p_code, boxes: p.p_boxes, fingerprint }
        events.set(p.p_request_id, saved)
        if (!restored.has(p.p_code)) {
          attempts.at(-1).responseLost = true
          res.destroy() // Sem cabeçalhos ou confirmação: o navegador recebe falha de rede.
          return
        }
        return json(res, 200, { data: { id: saved.id }, error: null })
      } catch {
        if (!res.destroyed) json(res, 400, { error: 'Requisição inválida.' })
      }
    },
  }
}
