import { useEffect, useRef, useState } from 'react'
import { applicationChangeLines, type ApplicationHistoryRecord, type ApplicationSnapshot } from '../lib/application-history'
import { loadApplicationHistory } from '../lib/inventory-api'
import { ProductApplications } from './ProductApplications'
import './ApplicationHistory.css'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function useApplicationHistory(code: string, enabled: boolean, page: number, size: number, revision: number) {
  const key = JSON.stringify([code, page, size, revision])
  const [result, setResult] = useState<{
    key: string; rows: ApplicationHistoryRecord[]; hasMore: boolean; error: string
  }>({ key: '', rows: [], hasMore: false, error: '' })

  useEffect(() => {
    if (!enabled) return
    let isCurrentRequest = true
    void loadApplicationHistory(code, page, size).then((data) => {
      if (isCurrentRequest) setResult({ key, ...data, error: '' })
    }).catch((error) => {
      if (isCurrentRequest) setResult({ key, rows: [], hasMore: false, error: error instanceof Error ? error.message : 'Não foi possível carregar o histórico.' })
    })
    return () => { isCurrentRequest = false }
  }, [code, enabled, page, size, revision, key])

  const current = enabled && result.key === key
  return {
    rows: current ? result.rows : [], hasMore: current && result.hasMore,
    error: current ? result.error : '', loading: enabled && !current,
  }
}

// A prévia acompanha o produto selecionado e atualiza depois de salvar uma alteração.
export function ApplicationHistory({ code, databaseMode, apiVersion, revision }: {
  code: string; databaseMode: boolean; apiVersion: number; revision: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const enabled = databaseMode && apiVersion >= 4
  const history = useApplicationHistory(code, enabled, 0, 3, revision + refresh)

  return <section className="application-history" aria-labelledby="application-history-title">
    <div className="application-history-heading"><div><h2 id="application-history-title">Histórico de alterações · {code}</h2><p>Prévia dos três registros mais recentes deste cadastro.</p></div><button className="theme-toggle" type="button" disabled={!enabled || history.loading} onClick={() => setRefresh((value) => value + 1)}>Atualizar histórico</button></div>
    {!databaseMode ? <p className="application-history-message">O histórico de alterações fica disponível nos cadastros salvos no Supabase.</p>
      : !enabled ? <p className="catalog-notice" role="status">O histórico de aplicações aguarda ativação no banco. As próximas alterações serão registradas após essa ativação.</p>
        : <>
          <HistoryResults history={history} compact />
          <div className="application-history-actions"><button className="add-product-button" type="button" disabled={history.loading || !history.rows.length} aria-label={`Ver histórico completo de ${code}`} onClick={() => setExpanded(true)}>Ver histórico completo</button></div>
          <p className="application-history-footnote">O histórico começa na sua ativação. Cadastros anteriores aparecem como situação inicial, sem atribuir autor ou data às edições antigas.</p>
        </>}
    {expanded && <HistoryDialog code={code} revision={revision} onClose={() => { setExpanded(false); setRefresh((value) => value + 1) }} />}
  </section>
}

function HistoryDialog({ code, revision, onClose }: { code: string; revision: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const history = useApplicationHistory(code, true, page, 10, revision + refresh)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])

  return <dialog className="application-history-dialog" ref={dialogRef} aria-labelledby="complete-history-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="application-history-dialog-heading"><div><h2 id="complete-history-title">Histórico completo · {code}</h2><p>Alterações de veículos, anos e tipo de amortecedor.</p></div><button className="theme-toggle" type="button" aria-label="Fechar histórico completo" onClick={onClose}>Fechar</button></div>
    <div className="application-history-dialog-body"><HistoryResults history={history} compact={false} /></div>
    <div className="application-history-pagination"><span>Página {page + 1} · até 10 registros</span><div>
      <button className="theme-toggle" type="button" disabled={history.loading} onClick={() => setRefresh((value) => value + 1)}>Atualizar</button>
      <button className="theme-toggle" type="button" disabled={history.loading || page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</button>
      <button className="theme-toggle" type="button" disabled={history.loading || !!history.error || !history.hasMore} onClick={() => setPage((value) => value + 1)}>Próxima</button>
    </div></div>
    <p className="application-history-footnote">Horários no fuso deste dispositivo. A situação inicial registra o que havia ao ativar o histórico; não reconstrói alterações anteriores.</p>
  </dialog>
}

function HistoryResults({ history, compact }: {
  history: { rows: ApplicationHistoryRecord[]; loading: boolean; error: string }; compact: boolean
}) {
  if (history.loading) return <p className="application-history-message" role="status">Carregando alterações…</p>
  if (history.error) return <p className="application-history-message auth-error" role="alert">{history.error}</p>
  if (!history.rows.length) return <p className="application-history-message" role="status">Nenhuma alteração registrada para este amortecedor.</p>
  return <ol className="application-history-list">{history.rows.map((record) => {
    const changes = applicationChangeLines(record)
    const displayedChanges = compact ? changes.slice(0, 2) : changes
    const actor = record.change_kind === 'baseline' ? 'Ativação do histórico'
      : record.actor_display_name || (record.actor_current_name ? `${record.actor_current_name} · nome atual do perfil`
        : record.performed_by ? `Usuário ${record.performed_by.slice(0, 8)}` : 'Responsável não registrado')
    return <li className="application-history-record" key={record.id}>
      <div className="application-history-record-heading"><strong>{record.change_kind === 'baseline' ? 'Situação inicial registrada' : 'Cadastro alterado'}</strong><time dateTime={record.created_at}>{dateFormatter.format(new Date(record.created_at))}</time></div>
      <p className="application-history-actor">{actor}</p>
      <ul className="application-change-lines">{displayedChanges.map((change, index) => <li key={index}>{change}</li>)}</ul>
      {compact && changes.length > 2 && <p className="application-history-more">Mais {changes.length - 2} alterações neste registro.</p>}
      {!compact && <details className="application-history-snapshots"><summary>Ver cadastro antes e depois</summary><div>
        <Snapshot title="Antes" snapshot={record.details_before} />
        <Snapshot title="Depois" snapshot={record.details_after} />
      </div></details>}
    </li>
  })}</ol>
}

function Snapshot({ title, snapshot }: { title: string; snapshot: ApplicationSnapshot | null }) {
  return <section><h3>{title}</h3>{snapshot
    ? <ProductApplications product={{ application: 'Nenhuma aplicação detalhada cadastrada.', defaultLocation: '', shockType: snapshot.shockType, vehicleApplications: snapshot.applications }} />
    : <p>Sem versão anterior registrada.</p>}</section>
}
