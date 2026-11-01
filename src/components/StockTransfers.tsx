import { useRef, useState, type FormEvent } from 'react'
import type { StockRow } from '../lib/inventory-api'
import { normalizeTransfer, registerTransfer, TransferRejectedError } from '../lib/transfer-api'
import { clearPendingTransfer, readPendingTransfer, savePendingTransfer, type PendingTransfer } from '../lib/pending-transfer'

const keyOf = (row: StockRow) => JSON.stringify([row.code, row.location, row.status])

export function StockTransfers({ userId, stock, locations, canTransfer, ready, onRefresh }: {
  userId: string; stock: StockRow[]; locations: string[]; canTransfer: boolean; ready: boolean; onRefresh: () => Promise<void>
}) {
  const [recovery, setRecovery] = useState(() => readPendingTransfer(userId))
  const [source, setSource] = useState('')
  const [to, setTo] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const pending = recovery.pending
  const eligible = stock.filter(row => row.boxes > 0 && locations.includes(row.location))
  const selected = eligible.find(row => keyOf(row) === source)

  async function resolve(operation: PendingTransfer) {
    if (!ready || !canTransfer || busy.current || recovery.error) return
    busy.current = true; setSaving(true); setError(''); setMessage('')
    let confirmed = operation.phase === 'confirmed'
    try {
      if (!confirmed) {
        await registerTransfer(operation.input, operation.requestId)
        confirmed = true
        const next: PendingTransfer = { ...operation, phase: 'confirmed' }
        setRecovery({ pending: next, error: '' })
        try { savePendingTransfer(next) } catch { /* O UUID original permanece recuperável. */ }
      }
      await onRefresh()
      clearPendingTransfer(userId)
      setRecovery({ pending: null, error: '' }); setSource(''); setTo(''); setQuantity('1')
      setMessage('Transferência registrada. Estoque e histórico atualizados.')
    } catch (caught) {
      if (caught instanceof TransferRejectedError) {
        try { clearPendingTransfer(userId); setRecovery({ pending: null, error: '' }) } catch { /* Conserva o bloqueio. */ }
      }
      setError(confirmed ? 'Transferência já salva. Atualize o pedido confirmado para consultar o estoque sem transferir novamente.' : caught instanceof Error ? caught.message : 'Não foi possível confirmar. Confira o pedido pendente.')
    } finally { busy.current = false; setSaving(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || !canTransfer || busy.current || pending || recovery.error || !selected) return
    try {
      const input = { row: { ...selected }, to, boxes: Number(quantity) }
      normalizeTransfer(input)
      if (!locations.includes(to)) throw new Error('Escolha um destino ativo.')
      const operation: PendingTransfer = { version: 1, userId, requestId: crypto.randomUUID(), input, phase: 'uncertain' }
      savePendingTransfer(operation)
      setRecovery({ pending: operation, error: '' })
      await resolve(operation)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível preparar o envio.') }
  }
  return <section className="transfer-form" aria-label="Transferir caixas entre prateleiras">
    <h3>Transferir entre prateleiras</h3>
    {!canTransfer ? <p>Sua função permite consultar o estoque, mas não registrar transferências.</p> : <>
      {!ready && <p role="status">O registro de transferências aguarda a atualização do banco para proteger pedidos após falhas de conexão.</p>}
      {recovery.error && <p className="auth-error" role="alert">{recovery.error}</p>}
      {pending && <div className="transfer-message" role="status">
        <strong>{pending.phase === 'confirmed' ? 'Transferência confirmada; atualização pendente' : 'Transferência aguardando confirmação'}</strong>
        <p>{pending.input.row.code} · {pending.input.row.location} → {pending.input.to} · {pending.input.boxes} caixas · {pending.input.row.status}</p>
        <p>Confira este pedido na mesma conta e aba, inclusive após recarregar. Fechar a aba ou limpar o armazenamento apaga a recuperação local.</p>
        <button type="button" disabled={saving || !ready} onClick={() => void resolve(pending)}>{pending.phase === 'confirmed' ? 'Atualizar pedido confirmado' : 'Conferir transferência pendente'}</button>
      </div>}
      <form onSubmit={submit}>
        <fieldset disabled={!ready || saving || Boolean(pending) || Boolean(recovery.error)}>
          <label>Saldo de origem da transferência<select required value={selected ? source : ''} onChange={event => { setSource(event.target.value); setTo('') }}>
            <option value="">Escolha produto, local e situação</option>{eligible.map(row => <option key={keyOf(row)} value={keyOf(row)}>{row.code} · {row.location} · {row.status} · {row.boxes} caixas</option>)}
          </select></label>
          <label>Destino da transferência<select required value={to} onChange={event => setTo(event.target.value)}><option value="">Escolha o destino</option>{locations.filter(location => location !== selected?.location).map(location => <option key={location}>{location}</option>)}</select></label>
          <label>Quantidade da transferência (caixas)<input type="number" required min="1" step="1" max={selected?.boxes ?? 0} value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
          <p>A situação das caixas é mantida na transferência.</p>
          <button type="submit" disabled={!selected || !to}>{saving ? 'Registrando…' : 'Registrar transferência'}</button>
        </fieldset>
      </form>
    </>}
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="transfer-message" role="status">{message}</p>}
  </section>
}
