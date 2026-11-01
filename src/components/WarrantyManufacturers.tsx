import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { startResumeRefresh } from '../lib/resume-refresh'
import { loadWarrantyManufacturers, saveWarrantyManufacturer, type WarrantyManufacturer } from '../lib/warranty-api'
import { WarrantyBoxesDialog } from './WarrantyBoxesDialog'
import { EditButton } from './EditButton'
import { WarrantyReturns } from './WarrantyReturns'
import { ExportCsvButton } from './ExportCsvButton'
import './WarrantyManufacturers.css'
import { saveOfflineWarranty } from '../lib/offline-stock'
import { OfflineWarranty } from './OfflineWarranty'
import { OfflineCustomerReturns } from './OfflineCustomerReturns'

export function WarrantyManufacturers({ apiVersion, isAdministrator, userId = '' }: {
  apiVersion: number; isAdministrator: boolean; userId?: string
}) {
  const ready = apiVersion >= 6
  const boxesReady = apiVersion >= 7
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ revision: number; withBoxes: boolean; rows: WarrantyManufacturer[]; error: string }>({ revision: -1, withBoxes: false, rows: [], error: '' })
  const [boxOperation, setBoxOperation] = useState<{ manufacturer: WarrantyManufacturer; direction: 'in' | 'out' } | null>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<WarrantyManufacturer | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const interaction = useRef({ name: '', editing: false, saving: false })
  const canAutoRefresh = useCallback(() => !interaction.current.name.trim() && !interaction.current.editing && !interaction.current.saving && !document.querySelector('dialog[open]'), [])
  const reportKey = `${revision}:${boxesReady}`
  const [automaticError, setAutomaticError] = useState({ key: '', message: '' })
  const loading = ready && (result.revision !== revision || result.withBoxes !== boxesReady)

  useEffect(() => {
    if (!ready) return
    let isCurrent = true
    let initialPending = true
    let hasReport = false
    function publish(rows: WarrantyManufacturer[]) {
      if (!isCurrent) return
      hasReport = true
      if (boxesReady) saveOfflineWarranty(userId, rows)
      setResult({ revision, withBoxes: boxesReady, rows, error: '' })
      setAutomaticError({ key: reportKey, message: '' })
    }
    void loadWarrantyManufacturers(boxesReady).then(publish).catch((loadError) => {
      if (isCurrent) setResult({ revision, withBoxes: boxesReady, rows: [], error: loadError instanceof Error ? loadError.message : 'Não foi possível carregar os fabricantes.' })
    }).finally(() => { initialPending = false })
    const stop = startResumeRefresh({
      intervalMs: 30_000, load: () => loadWarrantyManufacturers(boxesReady), apply: publish,
      canRefresh: () => !initialPending && canAutoRefresh(),
      onError: () => {
        if (hasReport) setAutomaticError({ key: reportKey, message: 'Não foi possível atualizar os saldos da garantia automaticamente. Os dados anteriores permanecem na tela.' })
        else setResult({ revision, withBoxes: boxesReady, rows: [], error: 'Não foi possível carregar os fabricantes e seus saldos. Tente atualizar a lista.' })
      },
    })
    return () => { isCurrent = false; stop() }
  }, [ready, boxesReady, revision, reportKey, canAutoRefresh, userId])

  function editManufacturer(manufacturer: WarrantyManufacturer) {
    if (!isAdministrator || saving) return
    interaction.current.editing = true
    interaction.current.name = manufacturer.name
    setEditing(manufacturer)
    setName(manufacturer.name)
    setError('')
    setMessage('')
    nameRef.current?.focus()
    nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function saveManufacturer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || !isAdministrator || saving || interaction.current.saving) return
    interaction.current.saving = true
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveWarrantyManufacturer(name, editing)
      setMessage(`${saved.name}: ${editing ? 'alteração salva' : 'fabricante cadastrado'}.`)
      setEditing(null)
      setName('')
      interaction.current.editing = false
      interaction.current.name = ''
      setRevision((value) => value + 1)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o fabricante.')
    } finally {
      interaction.current.saving = false
      setSaving(false)
    }
  }

  const filtered = result.rows.filter((manufacturer) => manufacturer.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))

  return <>
    {boxesReady && userId && <OfflineWarranty key={userId} userId={userId} role={isAdministrator?'administrator':'viewer'} onRefresh={async()=>{setRevision(value=>value+1)}}/>}
    {apiVersion >= 8 && userId && <OfflineCustomerReturns key={`returns:${userId}`} userId={userId} role={isAdministrator?'administrator':'viewer'} onRefresh={async()=>{setRevision(value=>value+1)}}/>}
    <div className="page-heading"><div><p className="eyebrow">AMORTECEDORES E MOLAS</p><h1>Garantia</h1><p className="subtitle">Controle as caixas em garantia de cada fabricante.</p></div></div>
    <section className="inventory-panel warranty-manufacturers" aria-labelledby="manufacturers-title">
      <div className="panel-heading"><div><h2 id="manufacturers-title">Fabricantes das peças</h2><p>Cadastro compartilhado entre amortecedores e molas.</p></div>{ready && !loading && !result.error && <span className="row-count">{result.rows.length} fabricantes</span>}</div>
      {boxesReady && !loading && !result.error && <ExportCsvButton name="liber-garantia-fabricantes" headers={['Fabricante','Amortecedores (caixas)','Molas (caixas)','Total (caixas)']} rows={filtered.map(row=>[row.name,row.shock_boxes??0,row.spring_boxes??0,(row.shock_boxes??0)+(row.spring_boxes??0)])}/>}
      {automaticError.key === reportKey && automaticError.message && <p className="manufacturer-feedback auth-error" role="status">{automaticError.message}</p>}
      {!ready ? <p className="manufacturer-notice" role="status">O cadastro de fabricantes aguarda ativação no banco. Depois da atualização, recarregue o site.</p> : <>
        {!boxesReady && <p className="manufacturer-notice" role="status">O saldo de caixas por fabricante aguarda ativação no banco. O cadastro dos fabricantes continua disponível.</p>}
        {isAdministrator && <form className="manufacturer-form" onSubmit={saveManufacturer}>
          <label htmlFor="manufacturer-name">{editing ? 'Editar fabricante' : 'Cadastrar fabricante'}<input ref={nameRef} id="manufacturer-name" value={name} onChange={(event) => { interaction.current.name = event.target.value; setName(event.target.value); setError(''); setMessage('') }} placeholder="Ex.: Moripar" maxLength={100} required disabled={saving} /></label>
          <button className="add-product-button" type="submit" disabled={saving || !name.trim()}>{saving ? 'Salvando…' : editing ? 'Salvar alteração' : 'Cadastrar'}</button>
          {editing && <button className="theme-toggle" type="button" disabled={saving} onClick={() => { interaction.current.editing = false; interaction.current.name = ''; setEditing(null); setName(''); setError('') }}>Cancelar edição</button>}
        </form>}
        {error && <p className="manufacturer-feedback auth-error" role="alert">{error}</p>}
        {message && <p className="manufacturer-feedback manufacturer-success" role="status">{message}</p>}
        <div className="manufacturer-list-tools"><label>Buscar fabricante<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome da marca ou fabricante" /></label><button className="theme-toggle" type="button" disabled={loading || saving} onClick={() => setRevision((value) => value + 1)}>Atualizar lista</button></div>
        {loading ? <p className="manufacturer-feedback" role="status">Carregando fabricantes…</p> : result.error ? <p className="manufacturer-feedback auth-error" role="alert">{result.error}</p>
          : filtered.length === 0 ? <p className="manufacturer-feedback" role="status">{result.rows.length ? 'Nenhum fabricante encontrado para esta busca.' : 'Nenhum fabricante cadastrado.'}</p>
            : <ul className="manufacturer-cards">{filtered.map((manufacturer) => <li key={manufacturer.id}>
              <div className="manufacturer-card-header"><div><span className="manufacturer-card-label">FABRICANTE / MARCA</span><h3>{manufacturer.name}</h3></div>{isAdministrator && <EditButton label={`Editar fabricante ${manufacturer.name}`} onClick={() => editManufacturer(manufacturer)} disabled={saving} />}</div>
              {boxesReady && <><div className="warranty-box-summary"><strong>{(manufacturer.shock_boxes ?? 0) + (manufacturer.spring_boxes ?? 0)} caixas</strong><span>Amortecedores: {manufacturer.shock_boxes ?? 0}</span><span>Molas: {manufacturer.spring_boxes ?? 0}</span></div>
                {isAdministrator && <div className="warranty-box-actions"><button className="add-product-button" type="button" disabled={saving} aria-label={`Adicionar caixas em ${manufacturer.name}`} onClick={() => setBoxOperation({ manufacturer, direction: 'in' })}>Adicionar caixas</button><button className="theme-toggle" type="button" disabled={saving || ((manufacturer.shock_boxes ?? 0) + (manufacturer.spring_boxes ?? 0) === 0)} aria-label={`Retirar caixas de ${manufacturer.name}`} onClick={() => setBoxOperation({ manufacturer, direction: 'out' })}>Retirar caixas</button></div>}
              </>}
            </li>)}</ul>}
      </>}
    </section>
    <WarrantyReturns userId={userId} ready={apiVersion >= 8} isAdministrator={isAdministrator} manufacturers={result.rows} revision={revision} onChanged={() => setRevision((value) => value + 1)} canAutoRefresh={canAutoRefresh} />
    {boxOperation && <WarrantyBoxesDialog manufacturer={boxOperation.manufacturer} direction={boxOperation.direction}
      onClose={() => setBoxOperation(null)} onSaved={(feedback) => { setBoxOperation(null); setMessage(feedback); setError(''); setRevision((value) => value + 1) }} />}
  </>
}
