import { useRef, useState, useSyncExternalStore } from 'react'
import type { StockRow } from '../lib/inventory-api'
import { changeMissionStatus, confirmPick, parseMissions, pickCode, readMissionRaw, sampleOrders, saveMissions, startPickMission, subscribeMissions, type MissionState, type PickStep } from '../lib/pick-missions'
import { locateMissionShelf } from '../lib/map-navigation'
import { createPickList, createPickListPdf, downloadPickListPdf, pickListHeaders } from '../lib/pick-list'
import { downloadCsv } from '../lib/csv'
import './PickMissions.css'

function PickItemForm({ step, onConfirm }: { step: PickStep; onConfirm: (scan: string, quantity: number) => void }) {
  const [scan, setScan] = useState('')
  const [quantity, setQuantity] = useState(String(step.quantity))
  const [reading, setReading] = useState('')
  return <form className="pick-item-form" aria-label="Conferência do item da missão" onSubmit={event => { event.preventDefault(); onConfirm(scan, Number(quantity)) }}>
    <h3>Conferir {step.code} em {step.location}</h3>
    <p>Solicitado: {step.quantity} caixas. Já separado: {step.counted}. Informe o total acumulado separado neste item, não um acréscimo.</p>
    <p>Código para leitura: <code>{pickCode(step)}</code></p>
    <label>Leitura do item<input autoComplete="off" required value={scan} onChange={event => { setScan(event.target.value); setReading('') }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); setReading(scan.trim().toUpperCase() === pickCode(step).toUpperCase() ? 'Código reconhecido. Confira a quantidade e confirme a separação.' : 'Código não corresponde a este item. Confira prateleira, produto e situação.') } }}/></label>
    {reading && <p role="status">{reading}</p>}
    <label>Total de caixas separadas neste item<input type="number" min={Math.max(1, step.counted)} max={step.quantity} step="1" required value={quantity} onChange={event => setQuantity(event.target.value)}/></label>
    <button className="theme-toggle" type="submit">Confirmar separação do item</button>
  </form>
}
export function PickMissions({ userId, stock, canOperate }: { userId: string; stock: StockRow[]; canOperate: boolean }) {
  const raw = useSyncExternalStore(subscribeMissions, () => readMissionRaw(userId), () => null)
  const [orderId, setOrderId] = useState(sampleOrders[0].id)
  const [feedback, setFeedback] = useState({ text: '', error: false })
  const busy = useRef(false)
  const [exporting, setExporting] = useState(false)
  const exportBusy = useRef(false)
  let state: MissionState | null = null, error = ''
  try { state = parseMissions(raw, userId) } catch { error = 'Não foi possível recuperar as missões locais. Os dados foram preservados; novas separações estão bloqueadas até a revisão.' }
  const order = sampleOrders.find(row => row.id === orderId)!
  const mission = state && Object.hasOwn(state.missions, orderId) ? state.missions[orderId] : null
  const current = mission?.status === 'active' ? mission.steps.find(row => row.counted < row.quantity) : null
  const counted = mission?.steps.reduce((sum, row) => sum + row.counted, 0) ?? 0
  const total = order.items.reduce((sum, item) => sum + item.boxes, 0)
  async function exportList(format: 'pdf' | 'csv') {
    if (!mission || error || exportBusy.current) return
    exportBusy.current = true; setExporting(true)
    try {
      const report = createPickList(mission, order.customer)
      if (format === 'csv') downloadCsv(`liber-retirada-${mission.orderId}`, pickListHeaders, report.rows)
      else downloadPickListPdf(await createPickListPdf(report), report.orderId)
      setFeedback({ text: `Lista ${format.toUpperCase()} gerada para ${report.orderId}. É uma cópia do momento da exportação; confira a missão atual antes de usar.`, error: false })
    } catch { setFeedback({ text: 'Não foi possível gerar a lista de retirada. A missão foi preservada; tente novamente.', error: true }) }
    finally { exportBusy.current = false; setExporting(false) }
  }
  function apply(change: (value: MissionState) => MissionState, message: string) {
    if (!state || !canOperate || busy.current) return
    busy.current = true
    try { saveMissions(change(state), raw); setFeedback({ text: message, error: false }) }
    catch (caught) { setFeedback({ text: caught instanceof Error ? caught.message : 'Não foi possível salvar a missão.', error: true }) }
    finally { busy.current = false }
  }
  return <section className="inventory-panel dashboard-panel pick-missions" aria-label="Modo missão">
    <h2>Modo missão — separar pedidos</h2>
    <p>Prepare o roteiro, confira a leitura e registre as caixas separadas. A disponibilidade da apresentação considera outras missões desta conta e navegador. Separação não registra venda, expedição ou baixa de estoque.</p>
    <label>Pedido para separar<select value={orderId} onChange={event => { setOrderId(event.target.value); setFeedback({ text: '', error: false }) }}>{sampleOrders.map(row => <option key={row.id} value={row.id}>{row.id} — {row.customer}</option>)}</select></label>
    <p><strong>{order.customer}</strong> · {total} caixas solicitadas.</p><ul>{order.items.map(item => <li key={item.code}>{item.code}: {item.boxes} caixas</li>)}</ul>
    {error && <p role="alert">{error}</p>}{feedback.text && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {!canOperate && <p>Perfil de consulta: a separação é feita pelo Administrador ou Estoquista.</p>}
    {(!mission || mission.status === 'cancelled') && <button className="theme-toggle" type="button" disabled={!state || !canOperate} onClick={() => apply(value => startPickMission(value, orderId, stock), 'Missão iniciada. Quantidades destinadas localmente a este pedido.')}>{mission ? 'Reiniciar missão cancelada' : 'Iniciar missão'}</button>}
    {mission && <>
      <p role="status">{mission.status === 'active' ? 'Missão em andamento' : mission.status === 'separated' ? 'Separação concluída — expedição não registrada' : 'Missão cancelada'} · {counted} de {total} caixas separadas.</p>
      <div className="pick-actions" aria-label="Exportar lista de retirada" aria-busy={exporting}>
        <button type="button" className="theme-toggle" disabled={exporting || Boolean(error)} onClick={() => void exportList('pdf')}>Baixar lista de retirada PDF</button>
        <button type="button" className="theme-toggle" disabled={exporting || Boolean(error)} onClick={() => void exportList('csv')}>Baixar lista de retirada CSV</button>
      </div>
      <p>A lista é uma cópia local do momento da exportação. Missões canceladas são identificadas no documento e não autorizam retirada.</p>
      <ol className="pick-route" aria-label="Roteiro por prateleira">{mission.steps.map((step, index) => <li key={step.id} aria-current={current?.id === step.id ? 'step' : undefined}>
        <h3>{index + 1}. {step.location} — {step.code}</h3><p>{step.status} · Solicitado: {step.quantity} · Separado: {step.counted} · {step.counted === step.quantity ? 'Item conferido' : 'Pendente'}</p>
        <button type="button" className="theme-toggle" onClick={() => { try { locateMissionShelf(userId, step.location) } catch (caught) { setFeedback({ text: caught instanceof Error ? caught.message : 'Não foi possível abrir o mapa.', error: true }) } }}>Localizar {step.location} no mapa</button>
      </li>)}</ol>
      {current && canOperate && !error && <PickItemForm key={`${orderId}:${current.id}:${current.counted}`} step={current} onConfirm={(scan, quantity) => apply(value => confirmPick(value, orderId, current.id, scan, quantity), 'Quantidade separada salva neste navegador.')}/>}
      {mission.status === 'active' && <div className="pick-actions"><button type="button" className="theme-toggle" disabled={Boolean(current) || !canOperate || Boolean(error)} onClick={() => apply(value => changeMissionStatus(value, orderId, 'separated'), 'Separação concluída localmente. As quantidades continuam destinadas a este pedido; nenhuma venda ou expedição foi registrada.')}>Concluir separação</button>
        <button type="button" className="theme-toggle" disabled={!canOperate || Boolean(error)} onClick={() => { if (window.confirm('Cancelar esta missão local? Confira o destino das caixas já separadas. Nenhum saldo será alterado.')) apply(value => changeMissionStatus(value, orderId, 'cancelled'), 'Missão cancelada localmente. Confira o destino físico das caixas já separadas.') }}>Cancelar missão local</button></div>}
    </>}
  </section>
}
