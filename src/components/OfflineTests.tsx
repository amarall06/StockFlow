import { useRef, useState } from 'react'
import { readOfflineTests, updateOfflineTest, type OfflineTest } from '../lib/offline-tests'
import { approveShockBoxes } from '../lib/shock-testing'
export function OfflineTests({ userId, role, onRefresh }: { userId: string; role: string; onRefresh: () => Promise<void> }) {
  const read = () => { try { return { rows: readOfflineTests(userId), error: '' } } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Falha ao ler testagens offline.' } } }
  const [state, setState] = useState(read)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  async function send(draft: OfflineTest) {
    if (busy.current || !['administrator','tester'].includes(role)) return
    if (!navigator.onLine) { setMessage('Reconecte-se para conferir a testagem.'); return }
    busy.current = true; setSaving(true); setMessage('')
    try {
      const current = readOfflineTests(userId).find(row => row.id === draft.id)
      if (!current || JSON.stringify(current) !== JSON.stringify(draft)) throw new Error('O pedido mudou. Reabra esta tela para conferir.')
      if (current.phase === 'draft' && !window.confirm(`Confirmar testagem preparada offline?\n${current.input.row.code} · ${current.input.row.location}\n${current.input.boxes} caixas\nReferência: ${current.id}\nConfirme somente se a testagem física destas caixas foi realizada. O servidor validará saldo e permissão e registrará responsável e data de confirmação.`)) return
      if (current.phase !== 'confirmed') {
        updateOfflineTest(userId, current.id, 'uncertain')
        setState(read())
        await approveShockBoxes(current.input.row.code, current.input.row.location, current.input.boxes, current.id)
        updateOfflineTest(userId, current.id, 'confirmed')
        setState(read())
      }
      await onRefresh()
      updateOfflineTest(userId, current.id, null)
      setState(read()); setMessage('Testagem offline confirmada. Estoque atualizado.')
    } catch (error) { setState(read()); setMessage(error instanceof Error ? error.message : 'Não foi possível conferir. Preserve o pedido e repita com o mesmo identificador.') }
    finally { busy.current = false; setSaving(false) }
  }
  if (!state.rows.length && !state.error && !message) return null
  return <section className="inventory-panel" aria-label="Testagens preparadas offline"><h2>Testagens preparadas offline</h2><p>Rascunhos não alteram o saldo. Confira um pedido por vez; sem resposta, preserve o mesmo identificador.</p>
    {state.error && <p role="alert">{state.error}</p>}{message && <p role="status">{message}</p>}
    <ul>{state.rows.map(row => <li key={row.id}>{row.input.row.code} · {row.input.row.location} · {row.input.boxes} caixas · referência {row.id} <button type="button" disabled={saving || !['administrator','tester'].includes(role)} onClick={() => void send(row)}>{row.phase === 'confirmed' ? 'Atualizar testagem confirmada' : row.phase === 'uncertain' ? 'Conferir testagem pendente' : 'Conferir e enviar testagem'}</button></li>)}</ul>
  </section>
}
