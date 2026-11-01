import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ProductInfo } from '../lib/inventory-api'
import { isSpringCode } from '../lib/product-category'
import { createSupplier, loadSuppliers, normalizeReceipt, receiveWithSupplier, type Supplier } from '../lib/receipt-api'
import { confirmOperation } from '../lib/confirm-operation'
import './ReceiptForm.css'
import { saveOfflineSuppliers } from '../lib/offline-stock'

export function ReceiptForm({ catalog, locations, springs, role, onReceived, userId = '' }: {
  userId?: string; catalog: Record<string,ProductInfo>; locations: string[]; springs: boolean; role: string; onReceived: () => Promise<void>
}) {
  const [code,setCode] = useState('')
  const [application,setApplication] = useState('')
  const [location,setLocation] = useState('')
  const [quantity,setQuantity] = useState('1')
  const [status,setStatus] = useState('awaiting_test')
  const [supplierId,setSupplierId] = useState('')
  const [lot,setLot] = useState('')
  const [supplierName,setSupplierName] = useState('')
  const [suppliers,setSuppliers] = useState<Supplier[]>([])
  const [revision,setRevision] = useState(0)
  const [loading,setLoading] = useState(true)
  const [loadError,setLoadError] = useState('')
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [saving,setSaving] = useState(false)
  const [creating,setCreating] = useState(false)
  const [recorded,setRecorded] = useState(false)
  const requestId = useRef<string | null>(null)
  const busy = useRef(false)
  const admin = role === 'administrator'
  const canReceive = admin || role === 'receiving'
  const known = catalog[code.trim().toUpperCase()]
  const disabled = saving || recorded || !canReceive

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('liber:offline-catalog', refresh)
    return () => window.removeEventListener('liber:offline-catalog', refresh)
  }, [])
  useEffect(() => {
    let current = true
    void loadSuppliers().then((rows) => { if (current) { saveOfflineSuppliers(userId, rows); setSuppliers(rows); setLoadError('') } })
      .catch((caught) => { if (current) setLoadError(caught instanceof Error ? caught.message : 'Falha ao carregar fornecedores.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  },[revision,userId])

  function changed() { requestId.current=null; setError(''); setMessage('') }
  function clearForm() {
    setCode(''); setApplication(''); setLocation(''); setQuantity('1'); setStatus('awaiting_test'); setLot(''); setSupplierId('')
    requestId.current=null; setRecorded(false)
  }
  async function syncSavedReceipt() {
    // Se a consulta falhar depois da gravação, repetir apenas a consulta evita nova entrada.
    try { await onReceived(); clearForm(); setMessage('Entrada salva. Histórico atualizado com os dados informados.') }
    catch { setError('Entrada já salva. Clique em Atualizar estoque para consultar o saldo, sem registrar novamente.') }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || creating || busy.current) return
    const normalizedCode=code.trim().toUpperCase()
    if (isSpringCode(normalizedCode)!==springs) { setError('Use um código da categoria desta página.'); return }
    if (!known && !admin) { setError('Somente administrador pode cadastrar produto novo.'); return }
    if (!known && !application.trim()) { setError('Informe a aplicação do produto novo.'); return }
    busy.current=true
    setSaving(true); setError(''); setMessage('')
    try {
      const input={code:normalizedCode,application:known ? '' : application,location,boxes:Number(quantity),status:springs?'in_stock':status,supplierId,lot}
      const normalized=normalizeReceipt(input)
      if(!confirmOperation('Confirmar entrada de estoque?', [
        `Produto: ${normalized.p_code}`, `Localização: ${normalized.p_location}`,
        `Quantidade: ${normalized.p_boxes} caixas`,
        `Situação: ${springs?'Em estoque':status==='released_for_sale'?'Liberado para venda':'Aguardando testagem'}`,
        `Fornecedor: ${suppliers.find(row=>row.id===supplierId)?.name??'Não informado'}`,
        `Lote: ${normalized.p_lot_reference??'Não informado'}`,
      ]))return
      requestId.current ??= crypto.randomUUID()
      await receiveWithSupplier(input,requestId.current)
      setRecorded(true)
      await syncSavedReceipt()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível registrar.') }
    finally { busy.current=false; setSaving(false) }
  }
  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!admin || creating || saving || recorded || busy.current) return
    busy.current=true
    setCreating(true); setError(''); setMessage('')
    try {
      const supplier=await createSupplier(supplierName)
      setSuppliers((rows)=>[...rows.filter((row)=>row.id!==supplier.id),supplier].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))
      setSupplierName(''); setSupplierId(supplier.id); requestId.current=null
      setMessage(`Fornecedor ${supplier.name} disponível e selecionado.`)
    } catch(caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível cadastrar.') }
    finally { busy.current=false; setCreating(false) }
  }
  return <div className="receipt-workspace">
    <form className="add-product-form receipt-form" onSubmit={submit} onChange={changed}>
      <div className="form-heading"><h2>Registrar entrada de estoque</h2><p>Fornecedor e lote são opcionais. Código novo cadastra o produto e sua entrada juntos.</p></div>
      <fieldset disabled={disabled || creating} className="receipt-fields">
        <label>Código do produto<input required maxLength={7} placeholder={springs?'MGM-12':'AGM-35'} value={code} onChange={(e)=>setCode(e.target.value)} /></label>
        <label>Aplicação (para código novo)<input maxLength={500} required={!known} disabled={!!known} value={known?.application ?? application} onChange={(e)=>setApplication(e.target.value)} /></label>
        <label>Localização<select required value={location} onChange={(e)=>setLocation(e.target.value)}><option value="">Escolha a prateleira</option>{locations.map((l)=><option key={l}>{l}</option>)}</select></label>
        {springs ? <label>Situação<input value="Em estoque" readOnly /></label> : <label>Situação<select disabled={!admin} value={status} onChange={(e)=>setStatus(e.target.value)}><option value="awaiting_test">Aguardando testagem</option>{admin && <option value="released_for_sale">Liberado para venda</option>}</select></label>}
        <label>Quantidade (caixas)<input type="number" required min="1" max="2147483647" step="1" value={quantity} onChange={(e)=>setQuantity(e.target.value)} /></label>
        <label>Fornecedor (opcional)<select value={supplierId} onChange={(e)=>{setSupplierId(e.target.value);if(!e.target.value)setLot('')}}><option value="">Não informado</option>{suppliers.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Referência do lote (opcional)<input maxLength={100} disabled={!supplierId} value={lot} onChange={(e)=>setLot(e.target.value)} placeholder={supplierId?'Ex.: DEMO-2026-01':'Selecione o fornecedor'} /></label>
      </fieldset>
      <button type="submit" className="add-product-button" disabled={disabled || creating || (!known && !admin)}>{saving?'Registrando…':'Registrar entrada'}</button>
      {recorded && <button type="button" className="theme-toggle" disabled={saving} onClick={()=>{setSaving(true);void syncSavedReceipt().finally(()=>setSaving(false))}}>Atualizar estoque</button>}
    </form>
    <div className="receipt-feedback">
      {loading && <p role="status">Carregando fornecedores…</p>}
      {loadError && <p role="alert">{loadError} <button type="button" className="theme-toggle" disabled={saving || creating || recorded} onClick={()=>{setLoading(true);setRevision((v)=>v+1)}}>Atualizar fornecedores</button></p>}
      {error && <p className="auth-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    </div>
    {admin && <details className="receipt-supplier-manager"><summary>Cadastrar fornecedor</summary><form onSubmit={addSupplier}><label>Nome do fornecedor<input required maxLength={100} value={supplierName} onChange={(e)=>setSupplierName(e.target.value)} disabled={creating || saving || recorded} placeholder="Ex.: Fornecedor fictício" /></label><button type="submit" className="add-product-button" disabled={creating || saving || recorded || !supplierName.trim()}>{creating?'Cadastrando…':'Cadastrar fornecedor'}</button></form></details>}
  </div>
}
