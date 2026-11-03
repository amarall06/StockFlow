import { useEffect, useRef, useState } from 'react'
import type { ProductInfo, StockRow } from '../lib/inventory-api'
import { calculateStockAlerts } from '../lib/stock-alerts'
import { nextStockNotices, type NoticeHistory } from '../lib/stock-notices'
import './StockNotice.css'

function readHistory(key: string): NoticeHistory {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item && typeof item === 'object' && Number.isFinite(item.total) && (item.minimum === null || Number.isFinite(item.minimum))))
  } catch { return {} }
}

// Montado com key=userId: nenhuma memória de aviso passa de uma conta para outra.
export function StockNotice({ userId, catalog, stock, onOpen }: {
  userId: string; catalog: Record<string, ProductInfo>; stock: StockRow[]; onOpen: () => void
}) {
  const key = `liber:stock-notices:v1:${userId}`
  const history = useRef<NoticeHistory | null>(null)
  const [codes, setCodes] = useState<string[]>([])
  useEffect(() => {
    history.current ??= readHistory(key)
    const rows = [...calculateStockAlerts(catalog, stock, false), ...calculateStockAlerts(catalog, stock, true)]
    const next = nextStockNotices(rows, history.current)
    history.current = next.history
    try { sessionStorage.setItem(key, JSON.stringify(next.history)) } catch { /* Memória continua funcionando sem armazenamento. */ }
    const current = new Set(rows.filter(row => row.severity !== 'ok').map(row => row.code))
    setCodes(old => [...new Set([...old.filter(code => current.has(code)), ...next.notices.map(row => row.code)])])
  }, [catalog, stock, key])
  if (!codes.length) return null
  return <aside className="stock-notice" aria-label="Aviso de estoque">
    <span className="stock-notice-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3v1"/></svg></span>
    <p role="status"><strong>Estoque baixo ou zerado</strong><br />{codes.length} {codes.length === 1 ? 'produto precisa' : 'produtos precisam'} de atenção: {codes.slice(0, 3).join(', ')}{codes.length > 3 ? '…' : ''}.</p>
    <div><button type="button" onClick={() => { setCodes([]); onOpen() }}>Ver alertas</button><button type="button" onClick={() => setCodes([])} aria-label="Fechar aviso de estoque">Fechar</button></div>
  </aside>
}
