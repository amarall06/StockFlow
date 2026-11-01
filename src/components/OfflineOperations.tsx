import { useState } from 'react'
import { outflowLabels } from '../lib/outflow-api'
import { readOfflineOperations, type OfflineOperation } from '../lib/offline-operations'
export function OfflineOperations({ userId, disabled, onSend }: { userId: string; disabled: boolean; onSend: (operation: OfflineOperation) => void }) {
  const [result] = useState(() => {
    try { return { rows: readOfflineOperations(userId), error: '' } }
    catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Falha ao ler rascunhos offline.' } }
  })
  if (!result.rows.length && !result.error) return null
  return <section className="inventory-panel" aria-label="Rascunhos offline"><h2>Rascunhos offline para conferência</h2>
    <p role="status">{result.rows.length} rascunhos neste aparelho. Não representam venda, reserva ou retirada confirmada. Confira e envie um por vez, conectado; o servidor validará saldo e permissão.</p>
    {result.error && <p role="alert">{result.error}</p>}
    <ul>{result.rows.map(row => <li key={row.id}>{outflowLabels[row.reason??'sale']} · {row.code} · {row.location} · {row.boxes} caixas · {row.notes || 'Sem observação'} · referência {row.id} <button type="button" disabled={disabled || Boolean(result.error)} onClick={() => onSend(row)}>Conferir e enviar {row.code}</button></li>)}</ul>
    <p>Se a resposta não chegar, confira o pedido pendente com o mesmo identificador. Não recrie a retirada manualmente.</p>
  </section>
}
