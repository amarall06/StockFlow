// Atualiza consultas ao retomar e, quando configurado, periodicamente.
// Não mantém conexão em tempo real e não envia operações de estoque.
export function startResumeRefresh<T>({ load, apply, onError, intervalMs = 0, canRefresh = () => true }: {
  load: () => Promise<T>; apply: (value: T) => void; onError: () => void
  intervalMs?: number; canRefresh?: () => boolean
}) {
  let active = true
  let busy = false
  let queued = false
  let timer: number | undefined

  function schedule() {
    if (!active || document.visibilityState === 'hidden' || !canRefresh()) return
    if (busy) { queued = true; return }
    window.clearTimeout(timer)
    // Agrupa focus/visibilitychange/online recebidos na mesma retomada.
    timer = window.setTimeout(() => { void refresh() }, 150)
  }
  async function refresh() {
    if (!active || busy || document.visibilityState === 'hidden' || !canRefresh()) return
    busy = true
    try {
      const value = await load()
      if (active && document.visibilityState === 'visible' && canRefresh()) apply(value)
    } catch {
      if (active) onError()
    } finally {
      busy = false
      if (queued) { queued = false; schedule() }
    }
  }
  window.addEventListener('focus', schedule)
  window.addEventListener('online', schedule)
  document.addEventListener('visibilitychange', schedule)
  const interval = intervalMs > 0 ? window.setInterval(schedule, intervalMs) : undefined
  return () => {
    active = false
    queued = false
    window.clearTimeout(timer)
    if (interval !== undefined) window.clearInterval(interval)
    window.removeEventListener('focus', schedule)
    window.removeEventListener('online', schedule)
    document.removeEventListener('visibilitychange', schedule)
  }
}
