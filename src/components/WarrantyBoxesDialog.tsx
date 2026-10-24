import { useEffect, useRef, useState, type FormEvent } from 'react'
import { changeWarrantyBoxes, type WarrantyManufacturer } from '../lib/warranty-api'

export function WarrantyBoxesDialog({ manufacturer, direction, onClose, onSaved }: {
  manufacturer: WarrantyManufacturer; direction: 'in' | 'out'; onClose: () => void; onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestId = useRef<string | null>(null)
  const [kind, setKind] = useState<'shock' | 'spring'>(() => direction === 'out' && !manufacturer.shock_boxes && (manufacturer.spring_boxes ?? 0) > 0 ? 'spring' : 'shock')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const available = kind === 'shock' ? manufacturer.shock_boxes ?? 0 : manufacturer.spring_boxes ?? 0

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])

  function changed() { requestId.current = null; setError('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const boxes = Number(quantity)
    if (!Number.isInteger(boxes) || boxes < 1 || (direction === 'out' && boxes > available)) {
      setError('Confira a quantidade inteira de caixas e o saldo disponível da categoria.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Reutiliza a identificação após falha de conexão para não duplicar a movimentação.
      requestId.current ??= crypto.randomUUID()
      await changeWarrantyBoxes({ manufacturerId: manufacturer.id, direction, kind, quantity: boxes, note, requestId: requestId.current })
      onSaved(`${direction === 'in' ? 'Entrada' : 'Retirada'} de ${boxes} ${boxes === 1 ? 'caixa' : 'caixas'} de ${kind === 'shock' ? 'amortecedores' : 'molas'} registrada em ${manufacturer.name}.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível registrar a operação.')
    } finally {
      setSaving(false)
    }
  }

  return <dialog ref={dialogRef} className="warranty-box-dialog" aria-labelledby="warranty-box-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}>
    <div className="warranty-box-dialog-heading"><div><h2 id="warranty-box-title">{direction === 'in' ? 'Adicionar caixas' : 'Retirar caixas'} · {manufacturer.name}</h2><p>Movimentação do saldo em garantia.</p></div><button className="theme-toggle" type="button" disabled={saving} onClick={onClose}>Fechar</button></div>
    <form onSubmit={submit}>
      <fieldset disabled={saving}>
        <label>Categoria<select value={kind} onChange={(event) => { setKind(event.target.value as 'shock' | 'spring'); changed() }}><option value="shock">Amortecedores</option><option value="spring">Molas</option></select></label>
        <p className="warranty-box-available">Saldo desta categoria: <strong>{available} caixas</strong></p>
        <label>Quantidade de caixas<input type="number" min="1" step="1" max={direction === 'out' ? available : undefined} value={quantity} onChange={(event) => { setQuantity(event.target.value); changed() }} required /></label>
        <label>Observação (opcional)<textarea value={note} maxLength={500} onChange={(event) => { setNote(event.target.value); changed() }} placeholder="Identificação ou motivo da movimentação" /></label>
      </fieldset>
      <p className="warranty-box-help">Este registro altera apenas o saldo da garantia. Uma retirada não envia caixas automaticamente ao estoque para venda.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="add-product-button" type="submit" disabled={saving || (direction === 'out' && available === 0)}>{saving ? 'Registrando…' : direction === 'in' ? 'Confirmar entrada' : 'Confirmar retirada'}</button>
    </form>
  </dialog>
}
