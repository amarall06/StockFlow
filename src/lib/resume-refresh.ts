// Atualiza consultas ao retomar e, quando configurado, periodicamente.
// O aviso Realtime apenas agenda a mesma leitura; não envia operações de estoque.
export const INVENTORY_CHANGE_EVENT = 'liber:inventory-change'
export function startResumeRefresh<T>({ load, apply, onError, intervalMs = 0, canRefresh = () => true }: {
  load: () => Promise<T>; apply: (value: T) => void; onError: (error?: unknown) => void
  intervalMs?: number; canRefresh?: () => boolean
}) {
  let active = true
  let busy = false
  let queued = false
  let timer: number | undefined
  const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

  function schedule() {
    if (!active || offline() || document.visibilityState === 'hidden' || !canRefresh()) return
    if (busy) { queued = true; return }
    window.clearTimeout(timer)
    // Agrupa focus/visibilitychange/online recebidos na mesma retomada.
    timer = window.setTimeout(() => { void refresh() }, 150)
  }
  async function refresh() {
    if (!active || busy || offline() || document.visibilityState === 'hidden' || !canRefresh()) return
    busy = true
    try {
      const value = await load()
      if (active && !offline() && document.visibilityState === 'visible' && canRefresh()) apply(value)
    } catch (error) {
      if (active) onError(error)
    } finally {
      busy = false
      if (queued) { queued = false; schedule() }
    }
  }
  window.addEventListener('focus', schedule)
  window.addEventListener('online', schedule)
  window.addEventListener(INVENTORY_CHANGE_EVENT, schedule)
  document.addEventListener('visibilitychange', schedule)
  const interval = intervalMs > 0 ? window.setInterval(schedule, intervalMs) : undefined
  return () => {
    active = false
    queued = false
    window.clearTimeout(timer)
    if (interval !== undefined) window.clearInterval(interval)
    window.removeEventListener('focus', schedule)
    window.removeEventListener('online', schedule)
    window.removeEventListener(INVENTORY_CHANGE_EVENT, schedule)
    document.removeEventListener('visibilitychange', schedule)
  }
}
