export type ReportPeriod = 'week' | 'month' | 'year'
export function reportPeriod(day: string, period: ReportPeriod) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Escolha uma data válida.')
  const start = new Date(`${day}T00:00:00Z`)
  if (!Number.isFinite(start.valueOf()) || start.toISOString().slice(0, 10) !== day) throw new Error('Escolha uma data válida.')
  if (period === 'week') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
  else if (period === 'month') start.setUTCDate(1)
  else if (period === 'year') start.setUTCMonth(0, 1)
  else throw new Error('Escolha um período válido.')
  const end = new Date(start)
  if (period === 'week') end.setUTCDate(end.getUTCDate() + 7)
  else if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1)
  else end.setUTCFullYear(end.getUTCFullYear() + 1)
  // Consulta por calendário de Salvador, independentemente do fuso do aparelho.
  const boundary = (date: Date) => {
    const offset = new Intl.DateTimeFormat('en', { timeZone: 'America/Bahia', timeZoneName: 'longOffset' }).formatToParts(date).find(part => part.type === 'timeZoneName')!.value.replace('GMT', '') || '+00:00'
    return new Date(`${date.toISOString().slice(0, 10)}T00:00:00${offset}`).toISOString()
  }
  return { start: boundary(start), end: boundary(end), label: `${start.toISOString().slice(0, 10)} a ${new Date(end.valueOf() - 86400000).toISOString().slice(0, 10)}` }
}
