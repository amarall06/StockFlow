import { useState } from 'react'
import type { RackPosition } from '../lib/floor-plan'
export function FloorRackEditor({ location, initial, onApply }: { location: string; initial: RackPosition; onApply: (value: RackPosition) => void }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, String(value)])))
  const [error, setError] = useState('')
  return <form className="floor-properties" aria-label={`Posição de ${location}`} onSubmit={event => { event.preventDefault(); try { onApply({ x: Number(draft.x), y: Number(draft.y), width: Number(draft.width), height: Number(draft.height) }); setError('') } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível aplicar.') } }}>
    <h5>Posição e dimensões</h5>
    <div>{[['x', 'Coluna X', 0], ['y', 'Linha Y', 0], ['width', 'Largura em células', 6], ['height', 'Altura em células', 5]].map(([field, label, min]) => <label key={field}> {label}<input aria-label={`${label} de ${location}`} type="number" min={min} max={field === 'y' || field === 'height' ? 32 : 48} step="1" required value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })}/></label>)}</div>
    {error && <p role="alert">{error}</p>}
    <button type="submit" className="theme-toggle">Aplicar posição</button>
  </form>
}
