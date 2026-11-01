import type { StockAlert } from './stock-alerts'

export type NoticeHistory = Record<string, { total: number; minimum: number | null }>

// Conserva apenas alertas atuais: recuperar o saldo permite avisar numa nova queda.
export function nextStockNotices(rows: StockAlert[], previous: NoticeHistory) {
  const history: NoticeHistory = {}
  const notices = rows.filter(row => {
    if (row.severity === 'ok') return false
    const old = previous[row.code]
    history[row.code] = { total: row.total, minimum: row.minimum }
    return !old || row.total < old.total || row.minimum !== old.minimum
  })
  return { history, notices }
}
