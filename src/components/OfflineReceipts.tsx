import { useRef, useState } from 'react'
import { readOfflineReceipts, updateOfflineReceipt, type OfflineReceipt } from '../lib/offline-receipts'
import { receiveWithSupplier } from '../lib/receipt-api'
export function OfflineReceipts({ userId, role, onRefresh }: { userId: string; role: string; onRefresh: () => Promise<void> }) {
  const read = () => { try { return { rows: readOfflineReceipts(userId), error: '' } } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Falha ao ler entradas offline.' } } }
  const [state, setState] = useState(read)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  async function send(draft: OfflineReceipt) {
    if (busy.current || !['administrator','receiving'].includes(role)) return
    if (!navigator.onLine) { setMessage('Reconecte-se para conferir a entrada.'); return }
    busy.current = true; setSaving(true); setMessage('')
    try {
      const current = readOfflineReceipts(userId).find(row => row.id === draft.id)
      if (!current || JSON.stringify(current) !== JSON.stringify(draft)) throw new Error('O pedido mudou. Reabra esta tela para conferir.')
      if(current.input.application.trim() && role!=='administrator')throw new Error('Somente Administrador envia cadastro de produto novo.');
      if (current.phase === 'draft' && !window.confirm(`Confirmar entrada preparada offline?\n${current.input.code} · ${current.input.location}\n${current.input.boxes} caixas\nAplicação: ${current.input.application || 'Produto existente'}\nSe o código já existir no servidor, a entrada usará o cadastro existente; não substitui sua aplicação.\nFornecedor: ${current.input.supplierId || 'Não informado'}\nLote: ${current.input.lot || 'Não informado'}\nReferência: ${current.id}\nO servidor validará produto, localização, situação e permissão.`)) return
      if (current.phase !== 'confirmed') {
        updateOfflineReceipt(userId, current.id, 'uncertain')
        setState(read())
        await receiveWithSupplier(current.input, current.id)
        updateOfflineReceipt(userId, current.id, 'confirmed')
        setState(read())
      }
      await onRefresh()
      updateOfflineReceipt(userId, current.id, null)
      setState(read()); setMessage('Entrada offline confirmada. Estoque atualizado.')
    } catch (error) { setState(read()); setMessage(error instanceof Error ? error.message : 'Não foi possível conferir. Preserve o pedido e repita com o mesmo identificador.') }
    finally { busy.current = false; setSaving(false) }
  }
  if (!state.rows.length && !state.error && !message) return null
  return <section className="inventory-panel" aria-label="Entradas preparadas offline"><h2>Entradas preparadas offline</h2><p>Rascunhos não alteram o saldo. Confira um pedido por vez; sem resposta, preserve o mesmo identificador.</p>
    {state.error && <p role="alert">{state.error}</p>}{message && <p role="status">{message}</p>}
    <ul>{state.rows.map(row => <li key={row.id}>{row.input.code} · {row.input.location} · {row.input.boxes} caixas · lote {row.input.lot || 'não informado'} · referência {row.id} <button type="button" disabled={saving || !['administrator','receiving'].includes(role)} onClick={() => void send(row)}>{row.phase === 'confirmed' ? 'Atualizar entrada confirmada' : row.phase === 'uncertain' ? 'Conferir entrada pendente' : 'Conferir e enviar entrada'}</button></li>)}</ul>
  </section>
}
