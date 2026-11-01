import { useRef, useState } from 'react'
import { readOfflineTransfers, updateOfflineTransfer, type OfflineTransfer } from '../lib/offline-transfers'
import { registerTransfer } from '../lib/transfer-api'
export function OfflineTransfers({ userId, role, onRefresh }: { userId: string; role: string; onRefresh: () => Promise<void> }) {
  const read = () => { try { return { rows: readOfflineTransfers(userId), error: '' } } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Falha ao ler transferências offline.' } } }
  const [state, setState] = useState(read)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  async function send(draft: OfflineTransfer) {
    if (busy.current || !['administrator','stockkeeper'].includes(role)) return
    if (!navigator.onLine) { setMessage('Reconecte-se para conferir a transferência.'); return }
    busy.current = true; setSaving(true); setMessage('')
    try {
      const current = readOfflineTransfers(userId).find(row => row.id === draft.id)
      if (!current || JSON.stringify(current) !== JSON.stringify(draft)) throw new Error('O pedido mudou. Reabra esta tela para conferir.')
      if (current.phase === 'draft' && !window.confirm(`Confirmar transferência preparada offline?\n${current.input.row.code} · ${current.input.row.location} → ${current.input.to}\n${current.input.boxes} caixas\nReferência: ${current.id}\nO servidor validará produto, localização, situação e permissão.`)) return
      if (current.phase !== 'confirmed') {
        updateOfflineTransfer(userId, current.id, 'uncertain')
        setState(read())
        await registerTransfer(current.input, current.id)
        updateOfflineTransfer(userId, current.id, 'confirmed')
        setState(read())
      }
      await onRefresh()
      updateOfflineTransfer(userId, current.id, null)
      setState(read()); setMessage('Transferência offline confirmada. Estoque atualizado.')
    } catch (error) { setState(read()); setMessage(error instanceof Error ? error.message : 'Não foi possível conferir. Preserve o pedido e repita com o mesmo identificador.') }
    finally { busy.current = false; setSaving(false) }
  }
  if (!state.rows.length && !state.error && !message) return null
  return <section className="inventory-panel" aria-label="Transferências preparadas offline"><h2>Transferências preparadas offline</h2><p>Rascunhos não alteram o saldo. Confira um pedido por vez; sem resposta, preserve o mesmo identificador.</p>
    {state.error && <p role="alert">{state.error}</p>}{message && <p role="status">{message}</p>}
    <ul>{state.rows.map(row => <li key={row.id}>{row.input.row.code} · {row.input.row.location} → {row.input.to} · {row.input.boxes} caixas · referência {row.id} <button type="button" disabled={saving || !['administrator','stockkeeper'].includes(role)} onClick={() => void send(row)}>{row.phase === 'confirmed' ? 'Atualizar transferência confirmada' : row.phase === 'uncertain' ? 'Conferir transferência pendente' : 'Conferir e enviar transferência'}</button></li>)}</ul>
  </section>
}
