import { ProductPhoto } from './ProductPhotos'
import { useRef, useState, type FormEvent } from 'react'
import { isSpringCode } from '../lib/product-category'
import { shockTypeLabels, updateProductDetails, type ProductInfo, type ShockType, type VehicleApplication } from '../lib/inventory-api'
import { ProductApplications } from './ProductApplications'
import { EditButton } from './EditButton'
import { ApplicationHistory } from './ApplicationHistory'
import './ProductCatalog.css'

type DraftApplication = { key: string; vehicleModel: string; yearFrom: string; yearTo: string }
type CatalogProps = {
  catalog: Record<string, ProductInfo>
  databaseMode: boolean
  apiVersion: number
  isAdministrator: boolean
  onUpdate: (code: string, product: ProductInfo) => void
}

// Esta aba foi limitada aos amortecedores a pedido do usuário.
export function ProductCatalog(props: CatalogProps) {
  const codes = Object.keys(props.catalog).filter((code) => !isSpringCode(code)).sort()
  const [selectedCode, setSelectedCode] = useState(codes[0] ?? '')
  const [dirty, setDirty] = useState(false)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)
  const code = codes.includes(selectedCode) ? selectedCode : codes[0] ?? ''
  const pendingMigration = props.databaseMode && props.apiVersion < 3

  return <>
    <div className="page-heading"><div><p className="eyebrow">AMORTECEDORES</p><h1>Cadastro de aplicações</h1><p className="subtitle">Informe os veículos e anos de cada amortecedor para facilitar a identificação pela etiqueta.</p></div></div>
    <section className="inventory-panel catalog-panel">
      <div className="catalog-selection"><label htmlFor="catalog-product">Amortecedor<select id="catalog-product" value={code} disabled={savingProduct || codes.length === 0} onChange={(event) => {
        if (dirty && !window.confirm('Descartar as alterações ainda não salvas deste produto?')) return
        setSelectedCode(event.target.value)
        setDirty(false)
        setMessage('')
      }}>{codes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      {pendingMigration && <p className="catalog-notice" role="status">O cadastro de veículos e anos aguarda ativação no banco. As consultas de estoque continuam disponíveis.</p>}
      {props.databaseMode && !props.isAdministrator && <p className="catalog-notice">Seu acesso permite consultar este cadastro. As alterações são feitas pelo administrador.</p>}
      {message && <p className="catalog-success" role="status">{message}</p>}
      {code ? <ProductEditor key={`${code}-${props.catalog[code].updatedAt ?? 'local'}-${revision}`}
        code={code} product={props.catalog[code]} databaseMode={props.databaseMode}
        editable={!pendingMigration && (!props.databaseMode || props.isAdministrator)}
        onSavingChange={setSavingProduct}
        onDirty={() => { setDirty(true); setMessage('') }}
        onSaved={(product) => {
          props.onUpdate(code, product)
          setDirty(false)
          setRevision((value) => value + 1)
          setMessage(props.databaseMode ? 'Aplicações salvas no Supabase.' : 'Aplicações atualizadas na demonstração local.')
        }} /> : <p className="history-message">Cadastre primeiro um amortecedor no estoque para informar suas aplicações.</p>}
      {code && <ApplicationHistory key={code} code={code} databaseMode={props.databaseMode} apiVersion={props.apiVersion} revision={revision} />}
    </section>
  </>
}

function ProductEditor({ code, product, databaseMode, editable, onDirty, onSaved, onSavingChange }: {
  code: string; product: ProductInfo; databaseMode: boolean; editable: boolean
  onDirty: () => void; onSaved: (product: ProductInfo) => void
  onSavingChange: (saving: boolean) => void
}) {
  const spring = isSpringCode(code)
  const [shockType, setShockType] = useState<ShockType | ''>(product.shockType ?? '')
  const [applications, setApplications] = useState<DraftApplication[]>(() => (product.vehicleApplications ?? []).map((application) => ({
    key: crypto.randomUUID(), vehicleModel: application.vehicleModel,
    yearFrom: application.yearFrom === null ? '' : String(application.yearFrom),
    yearTo: application.yearTo === null ? '' : String(application.yearTo),
  })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const editorFieldsRef = useRef<HTMLFieldSetElement>(null)

  function editSavedDetails() {
    // O formulário já contém os valores salvos: o lápis apenas leva até os campos.
    editorFieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    editorFieldsRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.focus({ preventScroll: true })
  }

  function changeApplication(key: string, field: 'vehicleModel' | 'yearFrom' | 'yearTo', value: string) {
    setApplications((current) => current.map((application) => application.key === key ? { ...application, [field]: value } : application))
    setError('')
    onDirty()
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable || saving) return
    setError('')
    const normalized: VehicleApplication[] = applications.map((application) => ({
      vehicleModel: application.vehicleModel.trim(),
      yearFrom: application.yearFrom === '' ? null : Number(application.yearFrom),
      yearTo: application.yearTo === '' ? null : Number(application.yearTo),
    }))
    const invalidYear = (year: number | null) => year !== null && (!Number.isInteger(year) || year < 1 || year > 9999)
    if (normalized.some((application) => !application.vehicleModel || application.vehicleModel.length > 120
      || invalidYear(application.yearFrom) || invalidYear(application.yearTo)
      || (application.yearFrom !== null && application.yearTo !== null && application.yearFrom > application.yearTo))) {
      setError('Informe o veículo e confira os anos. O ano inicial deve ser menor ou igual ao final.')
      return
    }
    const identities = normalized.map((application) => JSON.stringify([application.vehicleModel.toLocaleLowerCase('pt-BR'), application.yearFrom, application.yearTo]))
    if (new Set(identities).size !== identities.length) {
      setError('Há aplicações repetidas. Mantenha apenas uma linha para cada veículo e intervalo.')
      return
    }
    setSaving(true)
    onSavingChange(true)
    try {
      const type = spring ? null : shockType || null
      let updatedAt = product.updatedAt
      if (databaseMode) {
        if (!updatedAt) throw new Error('Recarregue a página para obter a versão atual deste cadastro.')
        updatedAt = await updateProductDetails({ code, shockType: type, applications: normalized, expectedUpdatedAt: updatedAt })
      }
      onSaved({ ...product, shockType: type, vehicleApplications: normalized, updatedAt })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o cadastro.')
    } finally {
      setSaving(false)
      onSavingChange(false)
    }
  }

  return <form className="catalog-editor" onSubmit={saveDetails}>
    <div className="catalog-product-heading"><ProductPhoto code={code}/><div><h2>{code}</h2><p>{spring ? 'Mola' : 'Amortecedor'} · Localização padrão: {product.defaultLocation}</p></div><span className="row-count">{applications.length} aplicações</span></div>
    <fieldset ref={editorFieldsRef} disabled={!editable || saving}>
      {!spring && <label className="catalog-type">Tipo de amortecedor<select value={shockType} onChange={(event) => { setShockType(event.target.value as ShockType | ''); onDirty() }}><option value="">Não informado</option>{Object.entries(shockTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <div className="catalog-application-heading"><h3>Carro e anos de aplicação</h3><p>Adicione uma linha para cada veículo ou faixa de anos. Deixe os anos vazios se ainda não tiver essa informação.</p></div>
      {applications.map((application, index) => <div className="catalog-application-row" key={application.key}>
        <label htmlFor={`vehicle-${application.key}`}>Veículo<input id={`vehicle-${application.key}`} value={application.vehicleModel} maxLength={120} onChange={(event) => changeApplication(application.key, 'vehicleModel', event.target.value)} placeholder="Ex.: Modelo fictício A" required /></label>
        <label htmlFor={`year-from-${application.key}`}>Ano inicial<input id={`year-from-${application.key}`} type="number" min="1" max="9999" step="1" value={application.yearFrom} onChange={(event) => changeApplication(application.key, 'yearFrom', event.target.value)} placeholder="Ex.: 2015" /></label>
        <label htmlFor={`year-to-${application.key}`}>Ano final<input id={`year-to-${application.key}`} type="number" min="1" max="9999" step="1" value={application.yearTo} onChange={(event) => changeApplication(application.key, 'yearTo', event.target.value)} placeholder="Ex.: 2020" /></label>
        <button className="catalog-remove" type="button" aria-label={`Remover aplicação ${index + 1}`} onClick={() => { setApplications((current) => current.filter((item) => item.key !== application.key)); onDirty() }}>Remover</button>
      </div>)}
      {applications.length === 0 && <p className="catalog-empty">Nenhum veículo detalhado cadastrado. A consulta usa a descrição atual: {product.application}</p>}
      <button className="theme-toggle" type="button" disabled={applications.length >= 50} onClick={() => { setApplications((current) => [...current, { key: crypto.randomUUID(), vehicleModel: '', yearFrom: '', yearTo: '' }]); onDirty() }}>+ Adicionar aplicação</button>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="catalog-save"><button className="add-product-button" type="submit">{saving ? 'Salvando…' : 'Salvar cadastro'}</button></div>
    </fieldset>
    <div className="catalog-preview"><div className="catalog-preview-heading"><h3>Cadastro salvo · visualização na consulta</h3>{editable && <EditButton label={`Editar cadastro salvo de ${code}`} onClick={editSavedDetails} disabled={saving} />}</div><ProductApplications product={product} /></div>
  </form>
}
