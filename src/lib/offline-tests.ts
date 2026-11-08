import type { StockRow } from './inventory-api'
import { isSpringCode } from './product-category'
type TestInput = { row: StockRow; boxes: number }
function normalizeTest(input: TestInput) { if(!input || !input.row || !/^(?:(?:AMD|AMT)-(?!MGM-|MFI-|MRE-|MFR-))?[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$/.test(input.row.code) || isSpringCode(input.row.code) || input.row.status!=='Aguardando testagem' || typeof input.row.location!=='string' || !input.row.location.trim() || !Number.isSafeInteger(input.row.boxes) || input.row.boxes<1 || !Number.isSafeInteger(input.boxes) || input.boxes<1 || input.boxes>input.row.boxes)throw new Error('Confira amortecedor aguardando testagem, local e quantidade dentro da consulta.') }
export type OfflineTest = { id: string; userId: string; input: TestInput; phase: 'draft' | 'uncertain' | 'confirmed' }
export const offlineTestsKey = (userId: string) => `liber:offline-tests:v1:${userId}`
export function readOfflineTests(userId: string): OfflineTest[] {
  const rows = JSON.parse(localStorage.getItem(offlineTestsKey(userId)) ?? '[]') as OfflineTest[]
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('Preserve os rascunhos de testagem para revisão: armazenamento inválido.')
  for (const row of rows) {
    if (!row || row.userId !== userId || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id) || !['draft','uncertain','confirmed'].includes(row.phase)) throw new Error('Rascunho de testagem inválido. Preserve os dados para revisão.')
    normalizeTest(row.input)
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Identificadores de testagem repetidos. Preserve os dados para revisão.')
  return rows
}
export function updateOfflineTest(userId: string, id: string, phase: OfflineTest['phase'] | null) {
  const rows = readOfflineTests(userId)
  const next = phase === null ? rows.filter(row => row.id !== id) : rows.map(row => row.id === id ? { ...row, phase } : row)
  if (phase && !rows.some(row => row.id === id)) throw new Error('O rascunho não está mais disponível nesta conta.')
  const value = JSON.stringify(next), key = offlineTestsKey(userId)
  localStorage.setItem(key, value)
  if (localStorage.getItem(key) !== value) throw new Error('Não foi possível confirmar a atualização do pedido neste aparelho. Preserve o identificador original.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
