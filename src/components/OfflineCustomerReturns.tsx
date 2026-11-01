import { useRef, useState } from 'react'
import { readOfflineCustomerReturns, updateOfflineCustomerReturn, type OfflineCustomerReturn } from '../lib/offline-customer-returns'
import { saveWarrantyReturn, loadWarrantyReturns, returnStatusLabels } from '../lib/warranty-returns'
export function OfflineCustomerReturns({ userId, role, onRefresh }: { userId: string; role: string; onRefresh: () => Promise<void> }) {
  const read = () => { try { return { rows: readOfflineCustomerReturns(userId), error: '' } } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Falha ao ler devoluçãos offline.' } } }
  const [state, setState] = useState(read)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  async function send(draft: OfflineCustomerReturn) {
    if (busy.current || !['administrator'].includes(role)) return
    if (!navigator.onLine) { setMessage('Reconecte-se para conferir a devolução.'); return }
    busy.current = true; setSaving(true); setMessage('')
    try {
      const current = readOfflineCustomerReturns(userId).find(row => row.id === draft.id)
      if (!current || JSON.stringify(current) !== JSON.stringify(draft)) throw new Error('O pedido mudou. Reabra esta tela para conferir.')
      if (current.phase === 'draft' && !window.confirm(`Confirmar devolução preparada offline?\n${current.input.description} · ${current.input.location}\n${current.input.boxes} caixas\nAndamento: ${returnStatusLabels[current.input.status]}\n${current.previous?.status === 'warranty' && current.input.status === 'closed' ? 'Retira caixas da garantia do fabricante.' : current.input.status === 'warranty' && current.previous?.status !== 'warranty' ? 'Soma caixas à garantia do fabricante.' : 'Não altera o saldo normal para venda.'}\nReferência: ${current.id}\nO servidor validará produto, localização, situação e permissão.`)) return
      if (current.phase !== 'confirmed') {
        updateOfflineCustomerReturn(userId, current.id, 'uncertain')
        setState(read())
        await saveWarrantyReturn(current.returnId, current.input, current.expectedUpdatedAt ?? null, current.id)
        updateOfflineCustomerReturn(userId, current.id, 'confirmed')
        setState(read())
      }
      await loadWarrantyReturns(); await onRefresh()
      updateOfflineCustomerReturn(userId, current.id, null)
      setState(read()); setMessage('Devolução offline confirmada. Lista atualizada.')
    } catch (error) { setState(read()); setMessage(error instanceof Error ? error.message : 'Não foi possível conferir. Preserve o pedido e repita com o mesmo identificador.') }
    finally { busy.current = false; setSaving(false) }
  }
  if (!state.rows.length && !state.error && !message) return null
  return <section className="inventory-panel" aria-label="Devoluções preparadas offline"><h2>Devoluções preparadas offline</h2><p>Novas devoluções ficam recebidas / em conferência, sem alterar saldos. Confira um pedido por vez; sem resposta, preserve o mesmo identificador.</p>
    {state.error && <p role="alert">{state.error}</p>}{message && <p role="status">{message}</p>}
    <ul>{state.rows.map(row => <li key={row.id}>{row.input.description} · {row.input.location} · {row.input.boxes} caixas · {returnStatusLabels[row.input.status]} · referência {row.id} <button type="button" disabled={saving || !['administrator'].includes(role)} onClick={() => void send(row)}>{row.phase === 'confirmed' ? 'Atualizar devolução confirmada' : row.phase === 'uncertain' ? 'Conferir devolução pendente' : 'Conferir e enviar devolução'}</button></li>)}</ul>
  </section>
}
