import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { MovementHistory } from './components/MovementHistory'
import { ProductCatalog } from './components/ProductCatalog'
import { ProfileSettings } from './components/ProfileSettings'
import { WarrantyManufacturers } from './components/WarrantyManufacturers'
import { ThemeToggle } from './components/ThemeToggle'
import { ShockTestButton, ShockTestingDialog } from './components/ShockTesting'
import { ReceiptForm } from './components/ReceiptForm'
import { StockOutflows } from './components/StockOutflows'
import { StockAlerts } from './components/StockAlerts'
import { InventoryDashboard } from './components/InventoryDashboard'
import { ProductApplications } from './components/ProductApplications'
import { searchableProductText } from './lib/product-details'
import { isSpringCode } from './lib/product-category'
import {
  createLocation,
  loadInventorySnapshot,
  receiveStock,
  registerProductAndReceive,
  stockStatusCode,
  transferStock,
  type ProductInfo,
  type StockRow,
} from './lib/inventory-api'
import { supabase } from './lib/supabase'
import './App.css'

// Dados fictícios para explorar a busca e a tabela; um código pode aparecer em mais de uma linha.
const demoLocations = [
  'A01', 'A03', 'B01', 'B02', 'C02', 'D04',
]

const demoStock: StockRow[] = [
  {
    code: 'AGM-35',
    location: 'A03',
    status: 'Aguardando testagem',
    boxes: 12,
  },
  {
    code: 'AGM-35',
    location: 'B01',
    status: 'Liberado para venda',
    boxes: 6,
  },
  { code: 'ARE-24', location: 'C02', status: 'Aguardando testagem', boxes: 8 },
  { code: 'AFR-57', location: 'A01', status: 'Liberado para venda', boxes: 4 },
  { code: 'AFI-89', location: 'D04', status: 'Aguardando testagem', boxes: 5 },
  { code: 'AFI-89', location: 'B02', status: 'Liberado para venda', boxes: 3 },
]

const demoCatalog: Record<string, ProductInfo> = {
  'AGM-35': { application: 'Amortecedor Chevrolet', defaultLocation: 'A03' },
  'ARE-24': { application: 'Renault — aplicação fictícia A', defaultLocation: 'C02' },
  'AFR-57': { application: 'Ford — aplicação fictícia B', defaultLocation: 'A01' },
  'AFI-89': { application: 'Fiat — aplicação fictícia C', defaultLocation: 'D04' },
}

// Molas têm cadastro próprio: não derivamos número, aplicação ou local do amortecedor.
const demoSpringCatalog: Record<string, ProductInfo> = {
  'MGM-12': { application: 'Mola Chevrolet — exemplo fictício', defaultLocation: 'A03' },
  'MRE-48': { application: 'Mola Renault — exemplo fictício', defaultLocation: 'C02' },
  'MFR-63': { application: 'Mola Ford — exemplo fictício', defaultLocation: 'A01' },
  'MFI-91': { application: 'Mola Fiat — exemplo fictício', defaultLocation: 'B02' },
}

// Quantidades fictícias para demonstrar o controle de molas por caixas.
const demoSpringStock: StockRow[] = [
  { code: 'MGM-12', location: 'A03', status: 'Em estoque', boxes: 2 },
  { code: 'MGM-12', location: 'A01', status: 'Em estoque', boxes: 3 },
  { code: 'MRE-48', location: 'C02', status: 'Em estoque', boxes: 4 },
  { code: 'MFR-63', location: 'A01', status: 'Em estoque', boxes: 1 },
  { code: 'MFI-91', location: 'B02', status: 'Em estoque', boxes: 5 },
]

// Junta os exemplos dos dois tipos para armazená-los no navegador.
const allDemoCatalog: Record<string, ProductInfo> = { ...demoCatalog, ...demoSpringCatalog }
const allDemoStock: StockRow[] = [...demoStock, ...demoSpringStock]

// Exibe as áreas de garantia e molas após a autorização do usuário.
const SHOW_DEVELOPMENT_MODULES = true

type SavedDemoData = {
  catalog: Record<string, ProductInfo>
  stock: StockRow[]
  locations: string[]
}

const STORAGE_KEY = 'liber-automotive-demo-v1'

// Lê a cópia salva no navegador; se não existir, começa com os exemplos.
function readSavedDemoData(): SavedDemoData | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const data = JSON.parse(saved) as {
      catalog?: SavedDemoData['catalog']
      stock?: Array<Partial<StockRow> & { quantity?: number }>
      locations?: string[]
    }
    if (!data.catalog || typeof data.catalog !== 'object' || Array.isArray(data.catalog) || !Array.isArray(data.stock) || !Array.isArray(data.locations)) return null
    // Migra o campo antigo quantity para boxes sem perder os exemplos já salvos.
    const savedStock = data.stock.map((row) => ({
      code: row.code ?? '',
      location: row.location ?? '',
      status: isSpringCode(row.code ?? '') ? 'Em estoque' as const : row.status ?? 'Aguardando testagem',
      boxes: row.boxes ?? row.quantity ?? 0,
    }))
    // Acrescenta dados fictícios de molas uma vez, sem substituir os saldos já editados.
    const savedSpringCodes = new Set(savedStock.filter((row) => isSpringCode(row.code)).map((row) => row.code))
    const missingSpringStock = savedSpringCodes.size === 0 ? demoSpringStock : []
    // Junta situações antigas de molas no mesmo local sem perder a quantidade local.
    const consolidatedStock = new Map<string, StockRow>()
    for (const row of savedStock) {
      const key = JSON.stringify([row.code, row.location, row.status])
      const existing = consolidatedStock.get(key)
      consolidatedStock.set(key, { ...row, boxes: (existing?.boxes ?? 0) + row.boxes })
    }
    return {
      catalog: { ...demoCatalog, ...(savedSpringCodes.size === 0 ? demoSpringCatalog : {}), ...(data.catalog as Record<string, ProductInfo>) },
      stock: [...consolidatedStock.values(), ...missingSpringStock],
      locations: data.locations,
    }
  } catch {
    return null
  }
}

function DemoApp({ onSignOut, displayName, userRole, profileName, email, onProfileUpdated, isDarkMode, onToggleTheme }: {
  onSignOut: () => void; displayName: string; userRole: string; profileName: string | null
  email: string; onProfileUpdated: (name: string) => void
  isDarkMode: boolean; onToggleTheme: () => void
}) {
  // Controla qual módulo está aberto na demonstração.
  const [activePage, setActivePage] = useState<'inventory' | 'warranty' | 'springs' | 'history' | 'catalog' | 'profile' | 'outflow' | 'dashboard'>('dashboard')
  const showInventoryPage = activePage === 'inventory' || activePage === 'springs'
  // O catálogo guarda os dados do produto, separados dos saldos por localização.
  const [catalog, setCatalog] = useState<Record<string, ProductInfo>>(() => readSavedDemoData()?.catalog ?? allDemoCatalog)
  const [scanCode, setScanCode] = useState('')
  const scanInputRef = useRef<HTMLInputElement>(null)
  const [scanResult, setScanResult] = useState<(ProductInfo & { code: string }) | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  // useState guarda o texto digitado na busca enquanto a tela está aberta.
  const [stock, setStock] = useState<StockRow[]>(() => readSavedDemoData()?.stock ?? allDemoStock)
  // Localizações usadas nos formulários de estoque e transferência.
  const [locations, setLocations] = useState<string[]>(() => readSavedDemoData()?.locations ?? demoLocations)
  const [newLocationCode, setNewLocationCode] = useState('')
  // A transferência física conserva a situação operacional das caixas.
  const [moveCode, setMoveCode] = useState('AGM-35')
  const [moveFrom, setMoveFrom] = useState('A03')
  const [moveTo, setMoveTo] = useState('A01')
  const [moveStatus, setMoveStatus] = useState<StockRow['status']>('Aguardando testagem')
  const [moveQuantity, setMoveQuantity] = useState('1')
  const [transferMessage, setTransferMessage] = useState('')
  const [search, setSearch] = useState('')
  // Estados dos campos do formulário para incluir um registro fictício.
  const [newCode, setNewCode] = useState('')
  const [newApplication, setNewApplication] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [newStatus, setNewStatus] = useState<StockRow['status']>('Aguardando testagem')
  const [storageMessage, setStorageMessage] = useState('Salvando dados...')
  const [dataMode, setDataMode] = useState<'demo' | 'database'>('demo')
  const [inventoryApiVersion, setInventoryApiVersion] = useState(0)
  const [testingRow, setTestingRow] = useState<StockRow | null>(null)

  // Reaproveita a mesma tela de estoque, filtrando somente amortecedores ou molas.
  const isSpringPage = activePage === 'springs'
  const springUpdatePending = isSpringPage && dataMode === 'database' && inventoryApiVersion < 2
  const productName = isSpringPage ? 'molas' : 'amortecedores'
  const productNameSingular = isSpringPage ? 'mola' : 'amortecedor'
  const activeCatalog = Object.fromEntries(Object.entries(catalog).filter(([code]) => isSpringCode(code) === isSpringPage))
  const activeStock = stock.filter((row) => isSpringCode(row.code) === isSpringPage)
  const effectiveMoveCode = activeCatalog[moveCode] ? moveCode : Object.keys(activeCatalog)[0] ?? ''
  const isAdministrator = userRole === 'administrator'
  const canReceiveStock = userRole === 'administrator' || userRole === 'receiving'
  const canTransferStock = userRole === 'administrator' || userRole === 'stockkeeper'
  const currentFormProductExists = Boolean(catalog[newCode.trim().toUpperCase()])
  const canSubmitStockForm = !springUpdatePending && (dataMode === 'demo'
    || (canReceiveStock && (currentFormProductExists || isAdministrator)))

  // Deixa o campo de leitura pronto para um leitor USB configurado como teclado.
  useEffect(() => {
    scanInputRef.current?.focus()
  }, [activePage])

  // Salva catálogo, saldos e localizações no navegador sempre que forem alterados.
  useEffect(() => {
    let isMounted = true
    loadInventorySnapshot().then((snapshot) => {
      if (!isMounted) return
      if (snapshot.locations.length === 0 && Object.keys(snapshot.catalog).length === 0) {
        setStorageMessage('Banco vazio; usando dados fictícios')
        return
      }
      setCatalog(snapshot.catalog)
      setInventoryApiVersion(snapshot.apiVersion)
      setStock(snapshot.stock)
      setLocations(snapshot.locations)
      setDataMode('database')
      setStorageMessage('Conectado ao Supabase')
    }).catch(() => {
      if (isMounted) setStorageMessage('Supabase indisponível; usando dados fictícios')
    })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (dataMode === 'database') {
      setStorageMessage('Conectado ao Supabase')
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ catalog, stock, locations }))
      setStorageMessage('Salvo neste navegador')
    } catch {
      setStorageMessage('Não foi possível salvar')
    }
  }, [catalog, stock, locations, dataMode])

  async function refreshDatabaseSnapshot() {
    const snapshot = await loadInventorySnapshot()
    setCatalog(snapshot.catalog)
    setInventoryApiVersion(snapshot.apiVersion)
    setStock(snapshot.stock)
    setLocations(snapshot.locations)
    setDataMode('database')
    setStorageMessage('Conectado ao Supabase')
  }

  // As opções de transferência dependem do produto, origem e situação selecionados.
  const movementOrigins = [...new Set(activeStock.filter((row) => row.code === effectiveMoveCode && row.boxes > 0).map((row) => row.location))]
  const movementStatuses = [...new Set(activeStock.filter((row) => row.code === effectiveMoveCode && row.location === moveFrom && row.boxes > 0).map((row) => row.status))]
  const availableForTransfer = activeStock
    .filter((row) => row.code === effectiveMoveCode && row.location === moveFrom && row.status === moveStatus)
    .reduce((sum, row) => sum + row.boxes, 0)
  const destinationOptions = locations.filter((location) => location !== moveFrom)

  // Filtra por código, aplicação ou localização sempre que a busca muda.
  const filteredStock = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return activeStock

    return activeStock.filter((row) =>
      `${row.code} ${searchableProductText(activeCatalog[row.code])} ${row.location}`
        .toLocaleLowerCase('pt-BR')
        .includes(term),
    )
  }, [search, activeStock, activeCatalog])

  // Set conta cada código uma vez; reduce soma as quantidades de caixas.
  const totalBoxes = activeStock.reduce((sum, row) => sum + row.boxes, 0)
  const productCount = Object.keys(activeCatalog).length
  const awaitingTest = activeStock
    .filter((row) => row.status === 'Aguardando testagem')
    .reduce((sum, row) => sum + row.boxes, 0)
  const released = activeStock
    .filter((row) => row.status === 'Liberado para venda')
    .reduce((sum, row) => sum + row.boxes, 0)

  // Mostra separadamente cada localização ligada ao código lido.
  const scannedLocations = scanResult
    ? stock.filter((row) => row.code === scanResult.code)
    : []

  // Restaura os exemplos originais para poder recomeçar a demonstração.
  function restoreDemoData() {
    setCatalog(allDemoCatalog)
    setStock(allDemoStock)
    setLocations(demoLocations)
    setTransferMessage('Dados fictícios restaurados.')
  }

  // Troca de módulo e limpa resultados para não misturar tipos de produto.
  function changePage(page: 'inventory' | 'warranty' | 'springs' | 'history' | 'catalog' | 'profile' | 'outflow' | 'dashboard') {
    setActivePage(page)
    setScanResult(null)
    setScanMessage('')
    setSearch('')
    setTransferMessage('')
  }

  // Cadastra uma prateleira para usá-la nos registros e nas transferências.
  function handleAddLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const location = newLocationCode.trim().toUpperCase()

    if (!location || locations.includes(location)) {
      window.alert('Informe uma localização nova, que ainda não esteja cadastrada.')
      return
    }

    if (dataMode === 'database' && !isAdministrator) {
      window.alert('Somente o administrador pode cadastrar localizações.')
      return
    }

    if (dataMode === 'database') {
      void createLocation(location).then(refreshDatabaseSnapshot).then(() => {
        setNewLocationCode('')
      }).catch(() => window.alert('Não foi possível cadastrar a localização. Verifique se sua conta é administradora.'))
    } else {
      setLocations((currentLocations) => [...currentLocations, location])
      setNewLocationCode('')
    }
  }

  // Transfere caixas sem mudar sua situação operacional.
  async function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (springUpdatePending) return
    const quantity = Number(moveQuantity)

    if (!effectiveMoveCode || !moveFrom || !moveTo || moveFrom === moveTo || !Number.isInteger(quantity) || quantity < 1 || quantity > availableForTransfer) {
      window.alert('Confira o produto, as localizações e a quantidade disponível para transferir.')
      return
    }

    if (dataMode === 'database') {
      try {
        await transferStock({
          code: effectiveMoveCode,
          from: moveFrom,
          to: moveTo,
          status: stockStatusCode(moveStatus),
          quantity,
        })
        await refreshDatabaseSnapshot()
        setTransferMessage(quantity + (quantity === 1 ? ' caixa transferida de ' : ' caixas transferidas de ') + moveFrom + ' para ' + moveTo + '. Situação mantida: ' + moveStatus + '.')
      } catch {
        setTransferMessage('Não foi possível transferir. Confira sua função de acesso e o saldo disponível no banco.')
      }
      return
    }

    setStock((currentStock) => {
      let remainingToMove = quantity
      const nextStock: StockRow[] = []

      // Desconta as caixas da origem sem mexer nas outras situações ou localizações.
      for (const row of currentStock) {
        const isSourceBalance = row.code === effectiveMoveCode && row.location === moveFrom && row.status === moveStatus
        if (!isSourceBalance || remainingToMove === 0) {
          nextStock.push(row)
          continue
        }

        const movedHere = Math.min(row.boxes, remainingToMove)
        remainingToMove -= movedHere
        if (row.boxes > movedHere) nextStock.push({ ...row, boxes: row.boxes - movedHere })
      }

      // Soma as caixas ao destino se o produto já estiver lá na mesma situação.
      const destinationIndex = nextStock.findIndex((row) => row.code === effectiveMoveCode && row.location === moveTo && row.status === moveStatus)
      if (destinationIndex >= 0) {
        nextStock[destinationIndex] = { ...nextStock[destinationIndex], boxes: nextStock[destinationIndex].boxes + quantity }
      } else {
        nextStock.push({ code: effectiveMoveCode, location: moveTo, status: moveStatus, boxes: quantity })
      }
      return nextStock
    })

    setTransferMessage(quantity + (quantity === 1 ? ' caixa de ' : ' caixas de ') + effectiveMoveCode + (quantity === 1 ? ' transferida de ' : ' transferidas de ') + moveFrom + ' para ' + moveTo + '. Situação mantida: ' + moveStatus + '.')
  }

  // O leitor normalmente digita o código no campo e envia Enter, como um teclado.
  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = scanCode.trim().toUpperCase()
    setScanCode('')
    const product = catalog[code]

    if (!product) {
      if (isSpringCode(code)) {
        setActivePage('springs')
        setScanResult(null)
        setScanMessage('Código de mola não encontrado no catálogo.')
        return
      }
      setScanResult(null)
      setScanMessage('Código não encontrado no catálogo.')
      return
    }

    // Se o QR for de mola, abre essa aba antes de mostrar os dados encontrados.
    setActivePage(isSpringCode(code) ? 'springs' : 'inventory')
    setScanResult({ code, ...product })
    setScanMessage('')
  }

  // Ao enviar, validamos o código e adicionamos uma linha ao estado do estoque.
  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // Evita que o navegador recarregue a página.
    if (springUpdatePending) return
    const normalizedCode = newCode.trim().toUpperCase()
    const codeIsValid = /^[A-Z]{3}-(100|[1-9]\d?)$/.test(normalizedCode)
    const codeMatchesPage = isSpringCode(normalizedCode) === isSpringPage
    const quantity = Number(newQuantity)

    if (!codeIsValid || !codeMatchesPage || (!catalog[normalizedCode] && !newApplication.trim()) || !locations.includes(newLocation) || !Number.isInteger(quantity) || quantity < 1) {
      const prefixHint = isSpringPage ? 'MGM, MFI, MRE ou MFR' : 'AGM, AFI, ARE ou AFR'
      window.alert(`Use um código com prefixo ${prefixHint} e número de 1 a 100, uma localização e caixas inteiras.`)
      return
    }

    if (dataMode === 'database' && (!canReceiveStock || (!catalog[normalizedCode] && !isAdministrator))) {
      window.alert('Sua função não permite registrar esta entrada ou cadastrar um produto novo.')
      return
    }

    if (dataMode === 'database') {
      const status = isSpringPage ? 'in_stock' : stockStatusCode(newStatus)
      try {
        if (catalog[normalizedCode]) {
          await receiveStock({ code: normalizedCode, location: newLocation, quantity, status })
        } else {
          await registerProductAndReceive({
            code: normalizedCode,
            application: newApplication.trim(),
            location: newLocation,
            quantity,
            status,
          })
        }
        await refreshDatabaseSnapshot()
        setNewCode('')
        setNewApplication('')
        setNewLocation('')
        setNewQuantity('1')
      } catch {
        window.alert('Não foi possível registrar as caixas. Confira a função de acesso e tente novamente.')
      }
      return
    }

    setStock((currentStock) => [
      ...currentStock,
      { code: normalizedCode, location: newLocation.trim(), status: isSpringPage ? 'Em estoque' : newStatus, boxes: quantity },
    ])
    // O primeiro cadastro deste código também define o padrão usado pela leitura.
    setCatalog((currentCatalog) => currentCatalog[normalizedCode] ? currentCatalog : {
      ...currentCatalog,
      [normalizedCode]: { application: newApplication.trim(), defaultLocation: newLocation.trim() },
    })
    setNewCode('')
    setNewApplication('')
    setNewLocation('')
    setNewQuantity('1')
  }

  return (
    <main className={`app-shell${isDarkMode ? ' theme-dark' : ''}`}>
      {/* A classe theme-dark faz o CSS aplicar a paleta escura quando o botão é ativado. */}
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="LIBER automotive, início" onClick={() => changePage('dashboard')}>
          <span className="brand-mark">L</span>
          <span>LIBER<span className="brand-light"> automotive</span></span>
        </a>

        <div className="sidebar-label">MÓDULOS</div>
        <button className={`nav-item${activePage === 'dashboard' ? ' active' : ''}`} type="button" onClick={() => changePage('dashboard')}><span className="nav-icon">▥</span> Painel</button>
        <button className={`nav-item${activePage === 'inventory' ? ' active' : ''}`} type="button" onClick={() => changePage('inventory')}>
          <span className="nav-icon">▦</span> Visão geral
        </button>
        {/* Os módulos extras são exibidos quando o usuário autoriza a apresentação. */}
        {SHOW_DEVELOPMENT_MODULES && <>
          <button className={`nav-item${activePage === 'warranty' ? ' active' : ''}`} type="button" onClick={() => changePage('warranty')}>
            <span className="nav-icon">◈</span> Garantia
          </button>
          <button className={`nav-item${activePage === 'springs' ? ' active' : ''}`} type="button" onClick={() => changePage('springs')}>
            <span className="nav-icon">⌁</span> Molas <small>futuro</small>
          </button>
        </>}

        {isAdministrator && <button className={`nav-item${activePage === 'outflow' ? ' active' : ''}`} type="button" onClick={() => changePage('outflow')}><span className="nav-icon">↗</span> Saídas</button>}
        <button className={`nav-item${activePage === 'history' ? ' active' : ''}`} type="button" onClick={() => changePage('history')}>
          <span className="nav-icon">↺</span> Histórico
        </button>
        <button className={`nav-item${activePage === 'catalog' ? ' active' : ''}`} type="button" onClick={() => changePage('catalog')}>
          <span className="nav-icon">▤</span> Aplicações
        </button>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          <span>{dataMode === 'database' ? 'Banco Supabase' : 'Modo de demonstração'}</span>
        </div>
      </aside>

      <section className="main-panel" id="inicio">
        <header className="topbar">
          <span className="breadcrumb">Estoque <span>/</span> {activePage === 'dashboard' ? 'Painel' : activePage === 'inventory' ? 'Visão geral' : activePage === 'warranty' ? 'Garantia' : activePage === 'outflow' ? 'Saídas' : activePage === 'history' ? 'Histórico' : activePage === 'catalog' ? 'Aplicações' : activePage === 'profile' ? 'Meu perfil' : 'Molas'}</span>
          <div className="user-chip"><ThemeToggle dark={isDarkMode} onToggle={onToggleTheme} /><button className="profile-open-button" type="button" onClick={() => changePage('profile')} aria-label="Abrir meu perfil" title={displayName}><span className="user-avatar">{displayName.slice(0, 1).toUpperCase()}</span><span className="profile-name-text">{displayName}<small>Meu perfil</small></span></button><button className="sign-out-button" type="button" onClick={onSignOut}>Sair</button></div>
        </header>

        <div className="content" id="consulta">
          {showInventoryPage ? <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">CONTROLE DE {isSpringPage ? 'MOLAS' : 'AMORTECEDORES'}</p>
              <h1>{isSpringPage ? 'Estoque de molas' : 'Visão geral'}</h1>
              <p className="subtitle">Consulte quantidades de {productName} por produto, localização e situação.</p>
            </div>
            <div className="page-heading-tools">
              <span className="storage-badge" role="status">{storageMessage}</span>
              <span className="demo-badge"><span /> {dataMode === 'database' ? 'Dados do Supabase' : 'Dados fictícios'}</span>
            </div>
          </div>

          {springUpdatePending && <p className="transfer-message" role="status">As situações antigas de molas precisam ser atualizadas no banco para “Em estoque”. Entradas e transferências de molas ficam aguardando essa atualização.</p>}
          <section className="scan-panel" aria-labelledby="scan-title">
            <div className="scan-heading">
              <div><h2 id="scan-title">Consultar {productNameSingular} pela leitura do código</h2><p>O campo fica pronto para um leitor USB: ele envia o código e Enter. Também é possível digitar.</p></div>
              <span className="scan-icon" aria-hidden="true">⌗</span>
            </div>
            <form className="scan-form" onSubmit={handleScan}>
              <label htmlFor="scan-code">Código da {productNameSingular} ou caixa</label>
              <div className="scan-input-row">
                <input ref={scanInputRef} id="scan-code" value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder={isSpringPage ? 'Ex.: MGM-35' : 'Ex.: ARE-24'} autoComplete="off" />
                <button type="submit">Consultar código</button>
              </div>
            </form>
            {scanResult && (
              <div className="scan-result" role="status">
                <div><span>CÓDIGO</span><strong>{scanResult.code}</strong></div>
                <div><span>APLICAÇÃO</span><ProductApplications product={scanResult} /></div>
                <div><span>LOCALIZAÇÃO PADRÃO</span><strong>{scanResult.defaultLocation}</strong></div>
              </div>
            )}
            {scanResult && scannedLocations.length > 0 && (
              <div className="scan-locations">
                <span className="scan-locations-title">LOCALIZAÇÕES CADASTRADAS</span>
                <ul>
                  {scannedLocations.map((row, index) => (
                    <li key={`${row.location}-${row.status}-${index}`}>
                      <strong>{row.location}</strong>
                      {row.location === scanResult.defaultLocation && <small>padrão</small>}
                      <span>{row.boxes} cx. ({row.boxes * 2} peças)</span>
                      <em>{row.status}</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scanMessage && <p className="scan-message" role="status">{scanMessage}</p>}
          </section>

          <section className="location-workspace" aria-labelledby="locations-title">
            <div className="location-workspace-heading">
              <div><h2 id="locations-title">Localizações e transferências</h2><p>Cadastre prateleiras e mova caixas de {productName} mantendo a situação atual.</p></div>
              <div className="location-header-actions"><span className="location-total">{locations.length} prateleiras</span>{dataMode === 'demo' && <button className="reset-demo-button" type="button" onClick={restoreDemoData}>Restaurar dados fictícios</button>}</div>
            </div>
            <div className="location-list" aria-label="Prateleiras cadastradas">
              {locations.map((location) => {
                const boxesAtLocation = activeStock.filter((row) => row.location === location).reduce((sum, row) => sum + row.boxes, 0)
                return <span className="location-chip" key={location}><strong>{location}</strong><small>{boxesAtLocation} cx. / {boxesAtLocation * 2} peças</small></span>
              })}
            </div>
            <div className="location-tools">
              <form className="location-create-form" onSubmit={handleAddLocation}>
                <h3>Cadastrar prateleira</h3>
                <p>Inclua um código de localização para usá-lo no estoque.</p>
                <label htmlFor="new-location">Código da localização</label>
              <div className="location-action-row"><input id="new-location" value={newLocationCode} onChange={(event) => setNewLocationCode(event.target.value)} placeholder="Ex.: E01" required /><button type="submit" disabled={dataMode === 'database' && !isAdministrator}>Adicionar local</button></div>
              </form>
              <form className="transfer-form" onSubmit={handleTransfer}>
                <h3>Transferir entre prateleiras</h3>
                <p>A quantidade transferida mantém a situação operacional.</p>
                <label>Produto<select value={effectiveMoveCode} onChange={(event) => {
                  const code = event.target.value
                  const firstBalance = stock.find((row) => row.code === code && row.boxes > 0)
                  const origin = firstBalance?.location ?? ''
                  setMoveCode(code)
                  setMoveFrom(origin)
                  setMoveStatus(firstBalance?.status ?? 'Aguardando testagem')
                  setMoveTo(locations.find((location) => location !== origin) ?? '')
                }}>{Object.keys(activeCatalog).map((code) => <option key={code}>{code}</option>)}</select></label>
                <label>Origem<select value={movementOrigins.includes(moveFrom) ? moveFrom : ''} onChange={(event) => {
                  const origin = event.target.value
                  const firstBalance = stock.find((row) => row.code === effectiveMoveCode && row.location === origin && row.boxes > 0)
                  setMoveFrom(origin)
                  setMoveStatus(firstBalance?.status ?? 'Aguardando testagem')
                  if (moveTo === origin) setMoveTo(locations.find((location) => location !== origin) ?? '')
                }}><option value="">Escolha a origem</option>{movementOrigins.map((location) => <option key={location}>{location}</option>)}</select></label>
                <label>Destino<select value={destinationOptions.includes(moveTo) ? moveTo : ''} onChange={(event) => setMoveTo(event.target.value)} required><option value="">Escolha o destino</option>{destinationOptions.map((location) => <option key={location}>{location}</option>)}</select></label>
                <label>Situação<select value={movementStatuses.includes(moveStatus) ? moveStatus : ''} onChange={(event) => setMoveStatus(event.target.value as StockRow['status'])} required><option value="">Escolha a situação</option>{movementStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Quantidade (caixas)<input type="number" min="1" max={availableForTransfer} step="1" value={moveQuantity} onChange={(event) => setMoveQuantity(event.target.value)} required /></label>
                <p className="transfer-available">Disponível na origem nesta situação: <strong>{availableForTransfer} caixas</strong></p>
                <button type="submit" disabled={springUpdatePending || (dataMode === 'database' && !canTransferStock)}>Registrar transferência</button>
                {transferMessage && <p className="transfer-message" role="status">{transferMessage}</p>}
              </form>
            </div>
          </section>

          <section className={`summary-grid${isSpringPage ? ' summary-grid-springs' : ''}`} aria-label="Resumo do estoque">
            <article className="summary-card">
              <div className="card-icon icon-blue">▦</div>
              <p className="card-label">Produtos</p>
              <p className="card-value">{productCount}</p>
              <p className="card-caption">códigos cadastrados</p>
            </article>
            <article className="summary-card">
              <div className="card-icon icon-violet">▤</div>
              <p className="card-label">Caixas registradas</p>
              <p className="card-value">{totalBoxes}</p>
              <p className="card-caption">equivale a {totalBoxes * 2} peças</p>
            </article>
            {!isSpringPage && <><article className="summary-card">
              <div className="card-icon icon-amber">◷</div>
              <p className="card-label">Caixas aguardando testagem</p>
              <p className="card-value">{awaitingTest}</p>
              <p className="card-caption">equivale a {awaitingTest * 2} peças</p>
            </article>
            <article className="summary-card">
              <div className="card-icon icon-green">✓</div>
              <p className="card-label">Caixas liberadas para venda</p>
              <p className="card-value">{released}</p>
              <p className="card-caption">equivale a {released * 2} peças</p>
            </article></>}
          </section>

          <StockAlerts key={isSpringPage ? 'spring-alerts' : 'shock-alerts'} catalog={catalog} stock={stock} springs={isSpringPage}
            ready={dataMode === 'database' && inventoryApiVersion >= 12} isAdministrator={isAdministrator} onRefresh={refreshDatabaseSnapshot} />
          <section className="inventory-panel">
            {dataMode === 'database' && inventoryApiVersion >= 10 ? <ReceiptForm key={isSpringPage ? 'springs' : 'shocks'}
              catalog={catalog} locations={locations} springs={isSpringPage} role={userRole} onReceived={refreshDatabaseSnapshot} /> : <form className="add-product-form" onSubmit={handleAddProduct}>
              <div className="form-heading"><h2>{dataMode === 'database' ? 'Registrar entrada de estoque' : 'Adicionar ao estoque de demonstração'}</h2><p>{dataMode === 'database' ? 'A entrada é gravada no Supabase junto com o histórico. Código novo cadastra produto e saldo inicial.' : 'Código novo cadastra o produto; código existente adiciona caixas a outra localização. Os dados ficam salvos neste navegador.'}</p></div>
              <label>Código do produto<input value={newCode} onChange={(event) => setNewCode(event.target.value)} placeholder={isSpringPage ? 'MGM-35' : 'ARE-24'} required /></label>
              <label>Aplicação (para código novo)<input value={catalog[newCode.trim().toUpperCase()]?.application ?? newApplication} onChange={(event) => setNewApplication(event.target.value)} placeholder={isSpringPage ? 'Ex.: Mola — aplicação fictícia' : 'Ex.: Renault — exemplo'} disabled={Boolean(catalog[newCode.trim().toUpperCase()])} required={!catalog[newCode.trim().toUpperCase()]} /></label>
              <label>Localização<select value={newLocation} onChange={(event) => setNewLocation(event.target.value)} required><option value="">Escolha a prateleira</option>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
              {isSpringPage ? <label>Situação<input value="Em estoque" readOnly /></label> : <label>Situação<select value={newStatus} onChange={(event) => setNewStatus(event.target.value as StockRow['status'])} disabled={dataMode === 'database' && userRole === 'receiving'}><option>Aguardando testagem</option>{(dataMode === 'demo' || isAdministrator) && <option>Liberado para venda</option>}</select></label>}
              <label>Quantidade (caixas)<input type="number" min="1" step="1" value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} required /></label>
              <button className="add-product-button" type="submit" disabled={!canSubmitStockForm}>{dataMode === 'database' ? 'Registrar entrada' : 'Adicionar registro'}</button>
            </form>}
            <div className="panel-heading">
              <div>
                <h2>Estoque de {productName} por localização</h2>
                <p>Quantidades em caixas; cada caixa contém 2 peças. O produto pode aparecer em vários locais e situações.</p>
              </div>
              <span className="row-count">{filteredStock.length} registros</span>
            </div>

            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar por código, aplicação ou localização..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar por código, aplicação ou localização"
              />
            </label>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>PRODUTO</th><th>LOCALIZAÇÃO</th><th>SITUAÇÃO</th><th className="quantity-heading">QUANTIDADE (CAIXAS)</th></tr>
                </thead>
                <tbody>
                  {filteredStock.map((row, index) => (
                    <tr key={`${row.code}-${row.location}-${row.status}`}>
                      <td>
                        <div className="product-cell">
                          <span className={`product-icon product-icon-${index % 2}`}>▰</span>
                          <span><strong>{row.code}</strong><ProductApplications product={activeCatalog[row.code]} /></span>
                        </div>
                      </td>
                      <td><span className="location-tag">{row.location}</span></td>
                      <td><span className={`status-pill ${row.status === 'Aguardando testagem' ? 'status-waiting' : 'status-released'}`}><span />{row.status}</span></td>
                      <td className="quantity-cell">{row.boxes}<span> cx.</span>{!isSpringPage && <ShockTestButton code={row.code} onClick={() => setTestingRow(row)} />}</td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr><td className="empty-state" colSpan={4}>Nenhum registro encontrado para “{search}”.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="table-note">{dataMode === 'database' ? 'Quantidades em caixas, consultadas no Supabase. Entradas e transferências ficam registradas na página Histórico.' : 'Demonstração: situação agrupada por caixa (regra ainda a confirmar). Quantidades fictícias em caixas; dados salvos neste navegador. Use “Restaurar dados fictícios” para recomeçar.'}</p>
          </section>
          </> : activePage === 'dashboard' ? <InventoryDashboard catalog={catalog} stock={stock} ready={dataMode === 'database' && inventoryApiVersion >= 13} onRefresh={refreshDatabaseSnapshot} onOpen={changePage} /> : activePage === 'outflow' ? <StockOutflows stock={stock} catalog={catalog} ready={dataMode === 'database' && inventoryApiVersion >= 11} isAdministrator={isAdministrator} onRefresh={refreshDatabaseSnapshot} /> : activePage === 'history' ? <MovementHistory /> : activePage === 'catalog' ? <ProductCatalog
            catalog={catalog} databaseMode={dataMode === 'database'} apiVersion={inventoryApiVersion}
            isAdministrator={isAdministrator}
            onUpdate={(code, product) => {
              setCatalog((current) => ({ ...current, [code]: product }))
              setScanResult((current) => current?.code === code ? { ...product, code } : current)
            }}
          /> : activePage === 'profile' ? <ProfileSettings displayName={profileName} email={email} role={userRole}
            apiVersion={inventoryApiVersion} onUpdated={onProfileUpdated} /> : <WarrantyManufacturers
              apiVersion={inventoryApiVersion} isAdministrator={isAdministrator} />}
        </div>
      </section>
      {testingRow && <ShockTestingDialog row={testingRow} ready={dataMode === 'database' && inventoryApiVersion >= 9}
        canApprove={userRole === 'administrator' || userRole === 'tester'} onClose={() => setTestingRow(null)}
        onRecorded={() => {
          setTestingRow(null)
          setTransferMessage('Aprovação de teste registrada com responsável e data.')
          void refreshDatabaseSnapshot().catch(() => setTransferMessage('Aprovação salva. Recarregue o site para atualizar os saldos.'))
        }} />}
    </main>
  )
}

type AuthView =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'inactive'; email: string }
  | { status: 'ready'; email: string; displayName: string | null; role: string }
  | { status: 'error'; message: string }

// Confere no banco se a conta autenticada tem um perfil ativo antes de exibir a interface.
function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return window.localStorage.getItem('liber-automotive-theme') === 'dark' } catch { return false }
  })
  const toggleTheme = () => setIsDarkMode((current) => !current)
  useEffect(() => {
    try { window.localStorage.setItem('liber-automotive-theme', isDarkMode ? 'dark' : 'light') } catch { /* O tema continua funcionando em memória. */ }
  }, [isDarkMode])
  const [authView, setAuthView] = useState<AuthView>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setAuthView({ status: 'error', message: 'A configuração local do Supabase está ausente. Confira o arquivo .env.local.' })
      return
    }

    let isMounted = true

    async function loadUserProfile(user: User) {
      if (!supabase) return
      const { data, error } = await supabase
        .from('profiles')
        .select('is_active, display_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted) return
      if (error) {
        setAuthView({ status: 'error', message: `Não foi possível carregar seu perfil: ${error.message}` })
        return
      }
      if (!data) {
        setAuthView({ status: 'error', message: 'A conta não possui perfil no sistema. Peça ao administrador para verificar o cadastro.' })
        return
      }
      if (!data.is_active) {
        setAuthView({ status: 'inactive', email: user.email ?? '' })
        return
      }
      setAuthView({ status: 'ready', email: user.email ?? '', displayName: data.display_name, role: data.role })
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setAuthView({ status: 'error', message: 'Não foi possível verificar a sessão. Atualize a página e tente novamente.' })
      } else if (data.session?.user) {
        void loadUserProfile(data.session.user)
      } else {
        setAuthView({ status: 'signed-out' })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // O microtask evita iniciar uma consulta Supabase dentro do callback interno de autenticação.
      queueMicrotask(() => {
        if (!isMounted) return
        if (session?.user) void loadUserProfile(session.user)
        else setAuthView({ status: 'signed-out' })
      })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setLoginError('')
    setIsSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setIsSubmitting(false)
    if (error) setLoginError('Não foi possível entrar. Confira o e-mail e a senha.')
    else setPassword('')
  }

  async function handleSignOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setLoginError('Não foi possível encerrar a sessão. Tente novamente.')
  }

  if (authView.status === 'loading') {
    return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}><section className="auth-card"><p>Conectando ao LIBER automotive…</p></section></AuthScreen>
  }

  if (authView.status === 'ready') {
    return <DemoApp onSignOut={handleSignOut} displayName={authView.displayName || authView.email || 'Usuário'} userRole={authView.role}
      profileName={authView.displayName} email={authView.email}
      isDarkMode={isDarkMode} onToggleTheme={toggleTheme}
      onProfileUpdated={(name) => setAuthView((current) => current.status === 'ready' ? { ...current, displayName: name } : current)} />
  }

  if (authView.status === 'inactive') {
    return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}><section className="auth-card"><Brand /><h1>Acesso aguardando liberação</h1><p>A conta <strong>{authView.email}</strong> foi criada, mas ainda não está ativa. Peça ao administrador para aprovar o acesso.</p><button className="auth-secondary-button" type="button" onClick={handleSignOut}>Sair</button></section></AuthScreen>
  }

  if (authView.status === 'error') {
    return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}><section className="auth-card"><Brand /><h1>Não foi possível abrir o sistema</h1><p className="auth-error" role="alert">{authView.message}</p>{loginError && <p className="auth-error" role="alert">{loginError}</p>}<button className="auth-secondary-button" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section></AuthScreen>
  }

  return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}>
    <section className="auth-card">
      <Brand />
      <p className="auth-eyebrow">CONTROLE DE ESTOQUE</p>
      <h1>Entrar no sistema</h1>
      <p className="auth-description">Use seu e-mail e senha cadastrados no LIBER automotive.</p>
      <form className="auth-form" onSubmit={handleLogin}>
        <label htmlFor="login-email">E-mail</label>
        <input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="login-password">Senha</label>
        <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {loginError && <p className="auth-error" role="alert">{loginError}</p>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </section>
  </AuthScreen>
}

function AuthScreen({ dark, onToggle, children }: { dark: boolean; onToggle: () => void; children: ReactNode }) {
  return <main className={`auth-screen${dark ? ' theme-dark' : ''}`}><div className="auth-theme-toggle"><ThemeToggle dark={dark} onToggle={onToggle} /></div>{children}</main>
}

function Brand() {
  return <div className="auth-brand"><span className="brand-mark">L</span><span>LIBER<span className="brand-light"> automotive</span></span></div>
}

export default App
