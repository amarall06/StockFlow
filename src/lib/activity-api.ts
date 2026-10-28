import { supabase } from './supabase'
import type { DashboardCategory } from './dashboard-api'
export type ActivityDay = { day: string; sold_boxes: number; received_boxes: number }
export function validateActivity(value: unknown, days: number): ActivityDay[] {
  if (!Array.isArray(value) || value.length !== days) throw new Error('O histórico diário chegou incompleto.')
  const seen = new Set<string>()
  for (const row of value) {
    if (!row || typeof row.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)
      || !Number.isFinite(Date.parse(row.day)) || new Date(row.day+'T00:00:00Z').toISOString().slice(0,10)!==row.day || seen.has(row.day)
      || !Number.isSafeInteger(row.sold_boxes) || row.sold_boxes < 0
      || !Number.isSafeInteger(row.received_boxes) || row.received_boxes < 0) throw new Error('O histórico diário chegou inválido.')
    seen.add(row.day)
  }
  const sorted = value.slice().sort((a,b) => a.day.localeCompare(b.day))
  if (sorted.some((row,index) => index>0 && Date.parse(row.day)-Date.parse(sorted[index-1].day)!==86400000)) throw new Error('Faltam dias no histórico.')
  return sorted
}
export async function loadActivity(category: DashboardCategory, days: number) {
  if (!['all','shocks','springs'].includes(category) || ![7,30,90].includes(days)) throw new Error('Filtro inválido.')
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('inventory_activity_daily', { p_category: category, p_days: days })
  if (error) throw new Error('Não foi possível consultar a atividade. Atualize os indicadores para tentar novamente.')
  return validateActivity(data, days)
}
