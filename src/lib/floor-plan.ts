export type RackPosition = { x: number; y: number; width: number; height: number }
export type FloorPlan = Record<'NORTE' | 'SUL' | 'LESTE' | 'OESTE', RackPosition>
export const floorGrid = { columns: 48, rows: 32, cell: 20 }
export const initialFloorPlan: FloorPlan = {
  NORTE: { x: 19, y: 3, width: 10, height: 5 },
  OESTE: { x: 5, y: 12, width: 9, height: 6 },
  LESTE: { x: 34, y: 12, width: 9, height: 6 },
  SUL: { x: 19, y: 24, width: 10, height: 5 },
}
export function validateFloorPlan(value: unknown): FloorPlan {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== 4) throw Error('Planta inválida. Os dados salvos foram preservados.')
  const plan = value as FloorPlan
  for (const code of Object.keys(initialFloorPlan) as (keyof FloorPlan)[]) {
    const rack = plan[code]
    if (!rack || ![rack.x, rack.y, rack.width, rack.height].every(Number.isSafeInteger) || rack.x < 0 || rack.y < 0 || rack.width < 6 || rack.height < 5 || rack.x + rack.width > floorGrid.columns || rack.y + rack.height > floorGrid.rows) throw Error('A posição deve caber na planta. Use largura mínima de 6 e altura mínima de 5 células.')
  }
  const rows = Object.values(plan)
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j]
    if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) throw Error('As prateleiras não podem ficar sobrepostas.')
  }
  return plan
}
export const floorPlanKey = (userId: string) => `liber:floor-plan:v1:${userId}`
export function parseFloorPlan(raw: string | null, userId: string): FloorPlan {
  if (raw === null) return structuredClone(initialFloorPlan)
  const value = JSON.parse(raw)
  if (!value || value.version !== 1 || value.userId !== userId) throw Error('Não foi possível recuperar esta planta. Os dados foram preservados.')
  return validateFloorPlan(value.layout)
}
export function saveFloorPlan(userId: string, layout: FloorPlan, expected: string | null) {
  const key = floorPlanKey(userId)
  if (!userId || localStorage.getItem(key) !== expected) throw Error('A planta mudou em outra aba. Reabra o Painel antes de salvar para preservar as duas edições.')
  validateFloorPlan(layout)
  const raw = JSON.stringify({ version: 1, userId, layout })
  localStorage.setItem(key, raw)
  if (localStorage.getItem(key) !== raw) throw Error('Não foi possível confirmar a gravação da planta.')
  return raw
}
