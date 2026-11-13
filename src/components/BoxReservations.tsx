import { useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { StockRow } from '../lib/inventory-api'
import { INVENTORY_CHANGE_EVENT } from '../lib/resume-refresh'

type Request = { id: string; balance: string; boxes: number }

export function BoxReservations({ userId, stock, onRefresh }: {
  userId: string; stock: StockRow[]; onRefresh: () => Promise<void>
}) {
  const key = `liber:box-reservation:v1:${userId}`
  const [request, setRequest] = useState<Request | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') }
    catch { return null }
  })
  const [reserved, setReserved] = useState(false)
  const [source, setSource] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const locked = useRef(false)
  const eligible = stock.filter(row => row.balanceId && row.status !== 'Aguardando testagem' && (row.availableBoxes ?? row.boxes) > 0)
  const selected = eligible.find(row => row.balanceId === source)

  async function change(operation: 'reserve' | 'cancel' | 'confirm', next: Request) {
    if (!supabase || locked.current) return
    locked.current = true
    setBusy(true)
    setMessage('')
    try {
      if (operation === 'reserve') {
        sessionStorage.setItem(key, JSON.stringify(next))
        setRequest(next)
      }
      const { data, error } = operation === 'reserve'
        ? await supabase.rpc('reserve_stock_boxes', { p_id: next.id, p_balance: next.balance, p_boxes: next.boxes })
        : await supabase.rpc('finish_stock_reservation', { p_id: next.id, p_confirm: operation === 'confirm' })
      if (error) {
        if (operation === 'reserve' && ['P0001', '22023', '42501'].includes(error.code)) {
          sessionStorage.removeItem(key)
          setRequest(null)
          setSource('')
          if (error.code === 'P0001') {
            try {
              await onRefresh()
              setMessage(error.message.includes('reservada')
                ? 'Esta caixa já foi reservada por outra pessoa. O saldo disponível foi atualizado.'
                : 'Saldo disponível insuficiente.')
            } catch { setMessage('Caixa indisponível. Não foi possível atualizar o saldo.') }
            return
          }
        }
        setMessage(error.code === 'P0001' ? error.message : 'Não foi possível confirmar a operação.')
        return
      }
      if (data?.state === 'reserved') {
        setReserved(true)
        setMessage(`${next.boxes} cx. reservadas`)
      } else if (data?.state === 'confirmed' || data?.state === 'cancelled') {
        sessionStorage.removeItem(key)
        setRequest(null)
        setReserved(false)
        setSource('')
        setMessage(data.state === 'confirmed' ? 'Saída confirmada' : 'Reserva cancelada')
      } else {
        setMessage('Confirmação indisponível.')
        return
      }
      window.dispatchEvent(new Event(INVENTORY_CHANGE_EVENT))
    } catch { setMessage('Não foi possível confirmar a operação.') }
    finally { locked.current = false; setBusy(false) }
  }

  function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const boxes = Number(quantity)
    if (selected?.balanceId && Number.isSafeInteger(boxes) && boxes > 0) {
      void change('reserve', { id: crypto.randomUUID(), balance: selected.balanceId, boxes })
    }
  }

  return <section className="inventory-panel" aria-labelledby="box-reservations-title">
    <h2 id="box-reservations-title">Separação com reserva</h2>
    {request ? <div className="page-heading-tools">
      {!reserved && <button type="button" className="ui-button" disabled={busy} onClick={() => void change('reserve', request)}>Consultar reserva</button>}
      {reserved && <button type="button" className="ui-button ui-button-primary" disabled={busy} onClick={() => {
        if (window.confirm(`Confirmar saída de ${request.boxes} caixa(s)?`)) void change('confirm', request)
      }}>Confirmar saída reservada</button>}
      <button type="button" className="ui-button" disabled={busy || !reserved} onClick={() => void change('cancel', request)}>Cancelar reserva</button>
    </div> : <form onSubmit={reserve} className="outflow-grid">
      <label>Saldo para separar<select required value={selected ? source : ''} onChange={event => setSource(event.target.value)}>
        <option value="">Selecione</option>
        {eligible.map(row => <option key={row.balanceId} value={row.balanceId}>{row.code} · {row.location} · {row.availableBoxes ?? row.boxes} cx.</option>)}
      </select></label>
      <label>Caixas para reservar<input type="number" min="1" max={selected?.availableBoxes ?? selected?.boxes} step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
      <button type="submit" className="ui-button ui-button-primary" disabled={busy || !selected}>Selecionar e reservar</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>
}
