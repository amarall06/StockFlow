import { useRef, useState } from 'react'
import { readOfflineWarranty, updateOfflineWarranty, type OfflineWarranty } from '../lib/offline-warranty'
import { changeWarrantyBoxes, loadWarrantyManufacturers } from '../lib/warranty-api'
export function OfflineWarranty({ userId, role, onRefresh }: { userId: string; role: string; onRefresh: () => Promise<void> }) {
  const read = () => { try { return { rows: readOfflineWarranty(userId), error: '' } } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Falha ao ler pedidos de garantia offline.' } } }
  const [state, setState] = useState(read)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  async function send(draft: OfflineWarranty) {
    if (busy.current || !['administrator'].includes(role)) return
    if (!navigator.onLine) { setMessage('Reconecte-se para conferir a operação de garantia.'); return }
    busy.current = true; setSaving(true); setMessage('')
    try {
      const current = readOfflineWarranty(userId).find(row => row.id === draft.id)
      if (!current || JSON.stringify(current) !== JSON.stringify(draft)) throw new Error('O pedido mudou. Reabra esta tela para conferir.')
      if (current.phase === 'draft' && !window.confirm(`Confirmar operação de garantia preparada offline?\n${current.manufacturerName ?? current.input.manufacturerId} · ${current.input.kind === 'shock' ? 'Amortecedores' : 'Molas'} · ${current.input.direction === 'in' ? 'Entrada em garantia' : 'Saída da garantia'}\n${current.input.quantity} caixas\nReferência: ${current.id}\nO servidor validará fabricante, saldo e permissão.`)) return
      if (current.phase !== 'confirmed') {
        updateOfflineWarranty(userId, current.id, 'uncertain')
        setState(read())
        await changeWarrantyBoxes({...current.input, requestId:current.id})
        updateOfflineWarranty(userId, current.id, 'confirmed')
        setState(read())
      }
      await loadWarrantyManufacturers(true); await onRefresh()
      updateOfflineWarranty(userId, current.id, null)
      setState(read()); setMessage('Operação de garantia offline confirmada. Estoque atualizado.')
    } catch (error) { setState(read()); setMessage(error instanceof Error ? error.message : 'Não foi possível conferir. Preserve o pedido e repita com o mesmo identificador.') }
    finally { busy.current = false; setSaving(false) }
  }
  if (!state.rows.length && !state.error && !message) return null
  return <section className="inventory-panel" aria-label="Pedidos de garantia preparados offline"><h2>Pedidos de garantia preparados offline</h2><p>Rascunhos não alteram o saldo. Confira um pedido por vez; sem resposta, preserve o mesmo identificador.</p>
    {state.error && <p role="alert">{state.error}</p>}{message && <p role="status">{message}</p>}
    <ul>{state.rows.map(row => <li key={row.id}>{row.manufacturerName ?? row.input.manufacturerId} · {row.input.kind === 'shock' ? 'Amortecedores' : 'Molas'} · {row.input.direction === 'in' ? 'Entrada em garantia' : 'Saída da garantia'} · {row.input.quantity} caixas · referência {row.id} <button type="button" disabled={saving || !['administrator'].includes(role)} onClick={() => void send(row)}>{row.phase === 'confirmed' ? 'Atualizar operação de garantia confirmada' : row.phase === 'uncertain' ? 'Conferir operação de garantia pendente' : 'Conferir e enviar operação de garantia'}</button></li>)}</ul>
  </section>
}
