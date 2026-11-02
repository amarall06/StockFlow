export type TestingGroup = { id: string; code: string; location: string; boxes: number; kind: 'shock' | 'spring'; awaiting: boolean; since: string | null }
export const testingReference = '2026-11-02'
export const sampleTestingGroups: TestingGroup[] = [
  { id: 'T-01', code: 'AGM-35', location: 'NORTE', boxes: 8, kind: 'shock', awaiting: true, since: '2026-10-31' },
  { id: 'T-02', code: 'AGM-35', location: 'NORTE', boxes: 7, kind: 'shock', awaiting: true, since: '2026-10-25' },
  { id: 'T-03', code: 'AGM-35', location: 'NORTE', boxes: 3, kind: 'shock', awaiting: true, since: '2026-10-17' },
  { id: 'T-04', code: 'AGM-35', location: 'NORTE', boxes: 2, kind: 'shock', awaiting: true, since: null },
]
function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Data inválida para conferir testagem.')
  const milliseconds = Date.parse(value + 'T00:00:00Z')
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== value) throw Error('Data inválida para conferir testagem.')
  return milliseconds / 86400000
}
export function validateTestingDays(days: number) {
  if (!Number.isSafeInteger(days) || days < 1 || days > 3650) throw Error('Informe um prazo inteiro entre 1 e 3650 dias corridos.')
  return days
}
export function testingDelays(groups: TestingGroup[], days: number, reference: string) {
  validateTestingDays(days)
  const referenceDay = day(reference), ids = new Set<string>()
  return groups.filter(group => group.kind === 'shock' && group.awaiting).map(group => {
    if (!group.id || ids.has(group.id) || !Number.isSafeInteger(group.boxes) || group.boxes < 1) throw Error('Grupo inválido na conferência de testagem.')
    ids.add(group.id)
    const age = group.since === null ? null : referenceDay - day(group.since)
    const situation = age === null ? 'unknown' : age < 0 ? 'future' : age > days ? 'overdue' : 'within'
    return { ...group, age, situation } as const
  })
}
export const testingDelayKey = (userId: string) => `liber:testing-delay:v1:${userId}`
export function parseTestingDays(raw: string | null, userId: string) {
  if (raw === null) return 7
  const value = JSON.parse(raw)
  if (!value || value.version !== 1 || value.userId !== userId) throw Error('Configuração de testagem inválida. Os dados foram preservados.')
  return validateTestingDays(value.days)
}
export function readTestingDays(userId: string) { try { return localStorage.getItem(testingDelayKey(userId)) } catch { return '!unavailable' } }
export function subscribeTestingDays(listener: () => void) {
  for (const event of ['storage', 'focus', 'liber:testing-delay']) window.addEventListener(event, listener)
  return () => { for (const event of ['storage', 'focus', 'liber:testing-delay']) window.removeEventListener(event, listener) }
}
export function saveTestingDays(userId: string, days: number, expected: string | null) {
  validateTestingDays(days)
  if (!userId || readTestingDays(userId) !== expected) throw Error('O prazo mudou em outra aba. Confira a configuração atual.')
  const raw = JSON.stringify({ version: 1, userId, days })
  localStorage.setItem(testingDelayKey(userId), raw)
  if (readTestingDays(userId) !== raw) throw Error('O navegador não confirmou a gravação do prazo.')
  window.dispatchEvent(new Event('liber:testing-delay'))
}
