export type DivergenceCheck = { sessionId: string; date: string; code: string; location: string; status: string; expected: number; counted: number; reviewed: boolean }
export type RecurrenceRule = { occurrences: number; days: number }
export const recurrenceReference = '2026-11-02'
const shock = 'Liberado para venda'
export const sampleDivergenceChecks: DivergenceCheck[] = [
  { sessionId: 'C-101', date: '2026-10-08', code: 'AGM-35', location: 'LESTE', status: shock, expected: 32, counted: 30, reviewed: true },
  { sessionId: 'C-102', date: '2026-10-20', code: 'AGM-35', location: 'LESTE', status: shock, expected: 31, counted: 32, reviewed: true },
  { sessionId: 'C-103', date: '2026-10-31', code: 'AGM-35', location: 'LESTE', status: shock, expected: 33, counted: 30, reviewed: true },
  { sessionId: 'C-104', date: '2026-10-12', code: 'MGM-35', location: 'SUL', status: 'Em estoque', expected: 12, counted: 13, reviewed: true },
  { sessionId: 'C-105', date: '2026-10-30', code: 'MGM-35', location: 'SUL', status: 'Em estoque', expected: 12, counted: 11, reviewed: true },
  { sessionId: 'C-106', date: '2026-10-22', code: 'AGM-35', location: 'NORTE', status: shock, expected: 20, counted: 20, reviewed: true },
  { sessionId: 'C-107', date: '2026-09-01', code: 'AGM-35', location: 'LESTE', status: shock, expected: 30, counted: 28, reviewed: true },
  { sessionId: 'C-108', date: '2026-11-01', code: 'AGM-35', location: 'LESTE', status: shock, expected: 33, counted: 20, reviewed: false },
]
function calendarDay(value: string) {
  const milliseconds = Date.parse(value + 'T00:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== value) throw Error('Data inválida no histórico de conferência.')
  return milliseconds / 86400000
}
export function validateRecurrenceRule(rule: RecurrenceRule) {
  if (!rule || !Number.isSafeInteger(rule.occurrences) || rule.occurrences < 2 || rule.occurrences > 100 || !Number.isSafeInteger(rule.days) || rule.days < 1 || rule.days > 3650) throw Error('Informe de 2 a 100 ocorrências e de 1 a 3650 dias corridos.')
  return rule
}
export function recurringDivergences(checks: DivergenceCheck[], rule: RecurrenceRule, reference: string) {
  validateRecurrenceRule(rule)
  const end = calendarDay(reference), seen = new Map<string, string>()
  const groups = new Map<string, { code: string; location: string; status: string; evidence: Array<DivergenceCheck & { difference: number }>; absoluteDifference: number }>()
  for (const check of checks) {
    if (!check.reviewed) continue
    const date = calendarDay(check.date)
    if (date > end || date < end - rule.days + 1) continue
    if (!check.sessionId || !check.code || !check.location || !check.status || !Number.isSafeInteger(check.expected) || check.expected < 0 || !Number.isSafeInteger(check.counted) || check.counted < 0) throw Error('Conferência inválida no histórico.')
    const groupKey = JSON.stringify([check.code, check.location, check.status])
    const identity = JSON.stringify([check.sessionId, groupKey]), fingerprint = JSON.stringify([check.date, check.expected, check.counted])
    if (seen.has(identity)) { if (seen.get(identity) !== fingerprint) throw Error('A mesma conferência tem resultados conflitantes.'); continue }
    seen.set(identity, fingerprint)
    const difference = check.counted - check.expected
    if (!difference) continue
    const group = groups.get(groupKey) ?? { code: check.code, location: check.location, status: check.status, evidence: [], absoluteDifference: 0 }
    group.evidence.push({ ...check, difference }); group.absoluteDifference += Math.abs(difference)
    if (!Number.isSafeInteger(group.absoluteDifference)) throw Error('Diferença acumulada inválida.')
    groups.set(groupKey, group)
  }
  return [...groups.values()].filter(group => group.evidence.length >= rule.occurrences).map(group => ({ ...group, evidence: group.evidence.sort((a,b) => b.date.localeCompare(a.date)) })).sort((a,b) => b.evidence.length - a.evidence.length || b.absoluteDifference - a.absoluteDifference || a.location.localeCompare(b.location))
}
export const recurrenceKey = (userId: string) => `liber:recurrence-rule:v1:${userId}`
export function readRecurrenceRaw(userId: string) { try { return localStorage.getItem(recurrenceKey(userId)) } catch { return '!unavailable' } }
export function parseRecurrenceRule(raw: string | null, userId: string): RecurrenceRule {
  if (raw === null) return { occurrences: 3, days: 30 }
  const value = JSON.parse(raw)
  if (!value || value.version !== 1 || value.userId !== userId) throw Error('Configuração de recorrência inválida.')
  return validateRecurrenceRule(value.rule)
}
export function subscribeRecurrence(listener: () => void) {
  for (const event of ['storage','focus','liber:recurrence-rule']) window.addEventListener(event,listener)
  return () => { for (const event of ['storage','focus','liber:recurrence-rule']) window.removeEventListener(event,listener) }
}
export function saveRecurrenceRule(userId: string, rule: RecurrenceRule, expected: string | null) {
  validateRecurrenceRule(rule)
  if (!userId || readRecurrenceRaw(userId) !== expected) throw Error('A regra mudou em outra aba. Confira a configuração atual.')
  const raw = JSON.stringify({ version: 1, userId, rule })
  localStorage.setItem(recurrenceKey(userId), raw)
  if (readRecurrenceRaw(userId) !== raw) throw Error('O navegador não confirmou a gravação da regra.')
  window.dispatchEvent(new Event('liber:recurrence-rule'))
}
