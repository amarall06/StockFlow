import type { StockRow } from './inventory-api'
export const sampleOrders = [
  { id: 'PED-1001', customer: 'Oficina Horizonte', items: [{ code: 'AGM-35', boxes: 8 }, { code: 'MGM-35', boxes: 4 }] },
  { id: 'PED-1002', customer: 'Auto Peças Central', items: [{ code: 'AGM-35', boxes: 9 }, { code: 'MGM-35', boxes: 5 }] },
  { id: 'PED-1003', customer: 'Oficina Avenida', items: [{ code: 'AGM-35', boxes: 7 }, { code: 'MGM-35', boxes: 4 }] },
]
export type PickStep = { id: string; code: string; location: string; status: StockRow['status']; quantity: number; counted: number }
export type PickMission = { orderId: string; status: 'active' | 'separated' | 'cancelled'; startedAt: string; updatedAt: string; steps: PickStep[] }
export type MissionState = { version: 1; userId: string; missions: Record<string, PickMission> }
const keyOf = (row: { code: string; location: string; status: string }) => JSON.stringify([row.code, row.location, row.status])
export const pickCode = (step: PickStep) => `LIBER|${step.location}|${step.code}|${step.status === 'Em estoque' ? 'EM_ESTOQUE' : 'LIBERADO'}`
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647
export function parseMissions(raw: string | null, userId: string): MissionState {
  if (raw === null) return { version: 1, userId, missions: {} }
  const state = JSON.parse(raw) as MissionState
  if (!state || state.version !== 1 || state.userId !== userId || !state.missions || typeof state.missions !== 'object' || Array.isArray(state.missions) || Object.keys(state.missions).length > sampleOrders.length) throw Error('Missões locais inválidas. Os dados foram preservados para revisão.')
  for (const [id, mission] of Object.entries(state.missions)) {
    const order = sampleOrders.find(row => row.id === id)
    if (!order || !mission || mission.orderId !== id || !['active', 'separated', 'cancelled'].includes(mission.status) || !Number.isFinite(Date.parse(mission.startedAt)) || !Number.isFinite(Date.parse(mission.updatedAt)) || !Array.isArray(mission.steps) || !mission.steps.length || mission.steps.length > 8) throw Error('Missão local inválida.')
    const seen = new Set<string>()
    for (const step of mission.steps) {
      if (!step || !order.items.some(item => item.code === step.code) || !['NORTE', 'SUL', 'OESTE'].includes(step.location) || !['Liberado para venda', 'Em estoque'].includes(step.status) || (step.code === 'MGM-35' ? step.status !== 'Em estoque' : step.status !== 'Liberado para venda') || step.id !== keyOf(step) || seen.has(step.id) || !integer(step.quantity) || step.quantity < 1 || !integer(step.counted) || step.counted > step.quantity) throw Error('Item de missão inválido.')
      seen.add(step.id)
    }
    if (order.items.some(item => mission.steps.filter(step => step.code === item.code).reduce((sum, step) => sum + step.quantity, 0) !== item.boxes) || (mission.status === 'separated' && mission.steps.some(step => step.counted !== step.quantity))) throw Error('Quantidades da missão não correspondem ao pedido.')
  }
  return state
}
export function startPickMission(state: MissionState, orderId: string, stock: StockRow[]): MissionState {
  const order = sampleOrders.find(row => row.id === orderId)
  if (!order) throw Error('Pedido não encontrado.')
  const current = Object.hasOwn(state.missions, orderId) ? state.missions[orderId] : null
  if (current && current.status !== 'cancelled') throw Error('Este pedido já possui missão. Continue a separação existente.')
  const balances = new Map<string, { row: StockRow; boxes: number }>()
  for (const row of stock) {
    if (!integer(row.boxes)) throw Error('Saldo inválido para iniciar missão.')
    if (row.location === 'LESTE' || !['NORTE', 'SUL', 'OESTE'].includes(row.location) || !['Liberado para venda', 'Em estoque'].includes(row.status)) continue
    const key = keyOf(row), boxes = (balances.get(key)?.boxes ?? 0) + row.boxes
    if (!integer(boxes)) throw Error('Saldo inválido para iniciar missão.')
    balances.set(key, { row, boxes })
  }
  for (const mission of Object.values(state.missions)) if (mission.status !== 'cancelled') for (const step of mission.steps) {
    const balance = balances.get(step.id)
    if (!balance || balance.boxes < step.quantity) throw Error('O saldo consultado diverge das missões locais. Preserve os pedidos para conferência.')
    balance.boxes -= step.quantity
  }
  const steps: PickStep[] = []
  for (const item of order.items) {
    let remaining = item.boxes
    for (const [id, balance] of [...balances].sort((a, b) => a[1].row.location.localeCompare(b[1].row.location))) {
      if (balance.row.code !== item.code || !balance.boxes || !remaining || (item.code === 'MGM-35' ? balance.row.status !== 'Em estoque' : balance.row.status !== 'Liberado para venda')) continue
      const quantity = Math.min(remaining, balance.boxes)
      steps.push({ id, code: item.code, location: balance.row.location, status: balance.row.status, quantity, counted: 0 })
      balance.boxes -= quantity; remaining -= quantity
    }
    if (remaining) throw Error(`Saldo disponível insuficiente para ${item.code}, considerando as outras missões locais e as prateleiras bloqueadas.`)
  }
  const now = new Date().toISOString()
  return { ...state, missions: { ...state.missions, [orderId]: { orderId, status: 'active', startedAt: now, updatedAt: now, steps } } }
}
export function confirmPick(state: MissionState, orderId: string, stepId: string, scan: string, counted: number): MissionState {
  const mission = state.missions[orderId], step = mission?.steps.find(row => row.id === stepId)
  if (!mission || mission.status !== 'active' || !step) throw Error('Missão ou item não disponível para separação.')
  const next = mission.steps.find(row => row.counted < row.quantity)
  if (next?.id !== stepId) throw Error('Confira o primeiro item pendente do roteiro.')
  if (scan.trim().toUpperCase() !== pickCode(step).toUpperCase()) throw Error('Código lido não corresponde à prateleira, produto e situação deste item.')
  if (!integer(counted) || counted < 1 || counted < step.counted || counted > step.quantity) throw Error('Informe o total separado entre a quantidade já registrada e a solicitada, sem ultrapassar o pedido.')
  return { ...state, missions: { ...state.missions, [orderId]: { ...mission, updatedAt: new Date().toISOString(), steps: mission.steps.map(row => row.id === stepId ? { ...row, counted } : row) } } }
}
export function changeMissionStatus(state: MissionState, orderId: string, status: 'separated' | 'cancelled'): MissionState {
  const mission = state.missions[orderId]
  if (!mission) throw Error('Missão não encontrada.')
  if (mission.status === status) return state
  if (mission.status !== 'active') throw Error('Esta missão já foi encerrada.')
  if (status === 'separated' && mission.steps.some(row => row.counted !== row.quantity)) throw Error('Confirme todos os itens antes de concluir a separação.')
  return { ...state, missions: { ...state.missions, [orderId]: { ...mission, status, updatedAt: new Date().toISOString() } } }
}
export const missionKey = (userId: string) => `liber:pick-missions:v1:${userId}`
export function readMissionRaw(userId: string) { try { return localStorage.getItem(missionKey(userId)) } catch { return '!storage-unavailable' } }
export function subscribeMissions(listener: () => void) {
  for (const event of ['storage', 'focus', 'liber:pick-missions']) window.addEventListener(event, listener)
  return () => { for (const event of ['storage', 'focus', 'liber:pick-missions']) window.removeEventListener(event, listener) }
}
export function saveMissions(state: MissionState, expectedRaw: string | null) {
  if (!state.userId || readMissionRaw(state.userId) !== expectedRaw) throw Error('A missão mudou em outra aba. Confira os dados atuais antes de tentar novamente.')
  const raw = JSON.stringify(state); parseMissions(raw, state.userId)
  localStorage.setItem(missionKey(state.userId), raw)
  if (localStorage.getItem(missionKey(state.userId)) !== raw) throw Error('O aparelho não confirmou a gravação da missão.')
  window.dispatchEvent(new Event('liber:pick-missions'))
}
