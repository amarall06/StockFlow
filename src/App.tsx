import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

// Cada linha representa a quantidade de caixas de um produto em uma localização e situação.
type StockRow = {
  code: string
  location: string
  status: 'Aguardando testagem' | 'Liberado para venda'
  boxes: number
}

type ProductInfo = {
  application: string
  defaultLocation: string
}

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
    const data = JSON.parse(saved) as Partial<SavedDemoData> & { stock?: Array<Partial<StockRow> & { quantity?: number }> }
    if (!data.catalog || typeof data.catalog !== 'object' || Array.isArray(data.catalog) || !Array.isArray(data.stock) || !Array.isArray(data.locations)) return null
    // Migra o campo antigo quantity para boxes sem perder os exemplos já salvos.
    const stock = data.stock.map((row) => ({
      code: row.code ?? '',
      location: row.location ?? '',
      status: row.status ?? 'Aguardando testagem',
      boxes: row.boxes ?? row.quantity ?? 0,
    }))
    return { catalog: data.catalog as Record<string, ProductInfo>, stock, locations: data.locations }
  } catch {
    return null
  }
}

function App() {
  // O catálogo guarda os dados do produto, separados dos saldos por localização.
  const [catalog, setCatalog] = useState<Record<string, ProductInfo>>(() => readSavedDemoData()?.catalog ?? demoCatalog)
  const [scanCode, setScanCode] = useState('')
  const [scanResult, setScanResult] = useState<(ProductInfo & { code: string }) | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  // useState guarda o texto digitado na busca enquanto a tela está aberta.
  const [stock, setStock] = useState<StockRow[]>(() => readSavedDemoData()?.stock ?? demoStock)
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
  // Este estado informa se o tema escuro está ligado.
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [storageMessage, setStorageMessage] = useState('Salvando dados...')

  // Salva catálogo, saldos e localizações no navegador sempre que forem alterados.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ catalog, stock, locations }))
      setStorageMessage('Salvo neste navegador')
    } catch {
      setStorageMessage('Não foi possível salvar')
    }
  }, [catalog, stock, locations])

  // As opções de transferência dependem do produto, origem e situação selecionados.
  const movementOrigins = [...new Set(stock.filter((row) => row.code === moveCode && row.boxes > 0).map((row) => row.location))]
  const movementStatuses = [...new Set(stock.filter((row) => row.code === moveCode && row.location === moveFrom && row.boxes > 0).map((row) => row.status))]
  const availableForTransfer = stock
    .filter((row) => row.code === moveCode && row.location === moveFrom && row.status === moveStatus)
    .reduce((sum, row) => sum + row.boxes, 0)
  const destinationOptions = locations.filter((location) => location !== moveFrom)

  // Filtra por código, aplicação ou localização sempre que a busca muda.
  const filteredStock = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return stock

    return stock.filter((row) =>
      `${row.code} ${catalog[row.code]?.application ?? ''} ${row.location}`
        .toLocaleLowerCase('pt-BR')
        .includes(term),
    )
  }, [search, stock, catalog])

  // Set conta cada código uma vez; reduce soma as quantidades de caixas.
  const totalBoxes = stock.reduce((sum, row) => sum + row.boxes, 0)
  const productCount = Object.keys(catalog).length
  const awaitingTest = stock
    .filter((row) => row.status === 'Aguardando testagem')
    .reduce((sum, row) => sum + row.boxes, 0)
  const released = stock
    .filter((row) => row.status === 'Liberado para venda')
    .reduce((sum, row) => sum + row.boxes, 0)

  // Mostra separadamente cada localização ligada ao código lido.
  const scannedLocations = scanResult
    ? stock.filter((row) => row.code === scanResult.code)
    : []

  // Restaura os exemplos originais para poder recomeçar a demonstração.
  function restoreDemoData() {
    setCatalog(demoCatalog)
    setStock(demoStock)
    setLocations(demoLocations)
    setTransferMessage('Dados fictícios restaurados.')
  }

  // Cadastra uma prateleira para usá-la nos registros e nas transferências.
  function handleAddLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const location = newLocationCode.trim().toUpperCase()

    if (!location || locations.includes(location)) {
      window.alert('Informe uma localização nova, que ainda não esteja cadastrada.')
      return
    }

    setLocations((currentLocations) => [...currentLocations, location])
    setNewLocationCode('')
  }

  // Transfere caixas sem mudar sua situação operacional.
  function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const quantity = Number(moveQuantity)

    if (!moveCode || !moveFrom || !moveTo || moveFrom === moveTo || !Number.isInteger(quantity) || quantity < 1 || quantity > availableForTransfer) {
      window.alert('Confira o produto, as localizações e a quantidade disponível para transferir.')
      return
    }

    setStock((currentStock) => {
      let remainingToMove = quantity
      const nextStock: StockRow[] = []

      // Desconta as caixas da origem sem mexer nas outras situações ou localizações.
      for (const row of currentStock) {
        const isSourceBalance = row.code === moveCode && row.location === moveFrom && row.status === moveStatus
        if (!isSourceBalance || remainingToMove === 0) {
          nextStock.push(row)
          continue
        }

        const movedHere = Math.min(row.boxes, remainingToMove)
        remainingToMove -= movedHere
        if (row.boxes > movedHere) nextStock.push({ ...row, boxes: row.boxes - movedHere })
      }

      // Soma as caixas ao destino se o produto já estiver lá na mesma situação.
      const destinationIndex = nextStock.findIndex((row) => row.code === moveCode && row.location === moveTo && row.status === moveStatus)
      if (destinationIndex >= 0) {
        nextStock[destinationIndex] = { ...nextStock[destinationIndex], boxes: nextStock[destinationIndex].boxes + quantity }
      } else {
        nextStock.push({ code: moveCode, location: moveTo, status: moveStatus, boxes: quantity })
      }
      return nextStock
    })

    setTransferMessage(quantity + (quantity === 1 ? ' caixa de ' : ' caixas de ') + moveCode + (quantity === 1 ? ' transferida de ' : ' transferidas de ') + moveFrom + ' para ' + moveTo + '. Situação mantida: ' + moveStatus + '.')
  }

  // O leitor normalmente digita o código no campo e envia Enter, como um teclado.
  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = scanCode.trim().toUpperCase()
    const product = catalog[code]

    if (!product) {
      setScanResult(null)
      setScanMessage('Código não encontrado no catálogo de demonstração.')
      return
    }

    setScanResult({ code, ...product })
    setScanMessage('')
  }

  // Ao enviar, validamos o código e adicionamos uma linha ao estado do estoque.
  function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // Evita que o navegador recarregue a página.
    const normalizedCode = newCode.trim().toUpperCase()
    const codeIsValid = /^[A-Z]{3}-(100|[1-9]\d?)$/.test(normalizedCode)
    const quantity = Number(newQuantity)

    if (!codeIsValid || (!catalog[normalizedCode] && !newApplication.trim()) || !locations.includes(newLocation) || !Number.isInteger(quantity) || quantity < 1) {
      window.alert('Use um código como ARE-24 (número de 1 a 100), uma localização e a quantidade em caixas inteiras.')
      return
    }

    setStock((currentStock) => [
      ...currentStock,
      { code: normalizedCode, location: newLocation.trim(), status: newStatus, boxes: quantity },
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
        <a className="brand" href="#inicio" aria-label="LIBER automotive, início">
          <span className="brand-mark">L</span>
          <span>LIBER<span className="brand-light"> automotive</span></span>
        </a>

        <div className="sidebar-label">ESTOQUE</div>
        <a className="nav-item active" href="#consulta">
          <span className="nav-icon">▦</span> Visão geral
        </a>
        <a className="nav-item" href="#consulta">
          <span className="nav-icon">⌕</span> Consultar produtos
        </a>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          <span>Modo de demonstração</span>
        </div>
      </aside>

      <section className="main-panel" id="inicio">
        <header className="topbar">
          <span className="breadcrumb">Estoque <span>/</span> Visão geral</span>
          <div className="user-chip"><span className="user-avatar">D</span><span>Demonstração</span></div>
        </header>

        <div className="content" id="consulta">
          <div className="page-heading">
            <div>
              <p className="eyebrow">CONTROLE DE AMORTECEDORES</p>
              <h1>Visão geral</h1>
              <p className="subtitle">Consulte quantidades por produto, localização e situação.</p>
            </div>
            <div className="page-heading-tools">
              {/* O clique inverte o estado e também troca o texto acessível do botão. */}
              <button className="theme-toggle" type="button" onClick={() => setIsDarkMode((current) => !current)} aria-pressed={isDarkMode} aria-label={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}>
                <span aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>{isDarkMode ? 'Modo claro' : 'Modo escuro'}
              </button>
              <span className="storage-badge" role="status">{storageMessage}</span>
              <span className="demo-badge"><span /> Dados fictícios</span>
            </div>
          </div>

          <section className="scan-panel" aria-labelledby="scan-title">
            <div className="scan-heading">
              <div><h2 id="scan-title">Consultar pela leitura do código</h2><p>Use um leitor que digita o código e envia Enter, ou digite-o abaixo.</p></div>
              <span className="scan-icon" aria-hidden="true">⌗</span>
            </div>
            <form className="scan-form" onSubmit={handleScan}>
              <label htmlFor="scan-code">Código da peça ou caixa</label>
              <div className="scan-input-row">
                <input id="scan-code" value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="Ex.: ARE-24" autoComplete="off" />
                <button type="submit">Consultar código</button>
              </div>
            </form>
            {scanResult && (
              <div className="scan-result" role="status">
                <div><span>CÓDIGO</span><strong>{scanResult.code}</strong></div>
                <div><span>APLICAÇÃO</span><strong>{scanResult.application}</strong></div>
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
              <div><h2 id="locations-title">Localizações e transferências</h2><p>Cadastre prateleiras e mova quantidades mantendo a situação atual.</p></div>
              <div className="location-header-actions"><span className="location-total">{locations.length} prateleiras</span><button className="reset-demo-button" type="button" onClick={restoreDemoData}>Restaurar dados fictícios</button></div>
            </div>
            <div className="location-list" aria-label="Prateleiras cadastradas">
              {locations.map((location) => {
                const boxesAtLocation = stock.filter((row) => row.location === location).reduce((sum, row) => sum + row.boxes, 0)
                return <span className="location-chip" key={location}><strong>{location}</strong><small>{boxesAtLocation} cx. / {boxesAtLocation * 2} peças</small></span>
              })}
            </div>
            <div className="location-tools">
              <form className="location-create-form" onSubmit={handleAddLocation}>
                <h3>Cadastrar prateleira</h3>
                <p>Inclua um código de localização para usá-lo no estoque.</p>
                <label htmlFor="new-location">Código da localização</label>
                <div className="location-action-row"><input id="new-location" value={newLocationCode} onChange={(event) => setNewLocationCode(event.target.value)} placeholder="Ex.: E01" required /><button type="submit">Adicionar local</button></div>
              </form>
              <form className="transfer-form" onSubmit={handleTransfer}>
                <h3>Transferir entre prateleiras</h3>
                <p>A quantidade transferida mantém a situação operacional.</p>
                <label>Produto<select value={moveCode} onChange={(event) => {
                  const code = event.target.value
                  const firstBalance = stock.find((row) => row.code === code && row.boxes > 0)
                  const origin = firstBalance?.location ?? ''
                  setMoveCode(code)
                  setMoveFrom(origin)
                  setMoveStatus(firstBalance?.status ?? 'Aguardando testagem')
                  setMoveTo(locations.find((location) => location !== origin) ?? '')
                }}>{Object.keys(catalog).map((code) => <option key={code}>{code}</option>)}</select></label>
                <label>Origem<select value={movementOrigins.includes(moveFrom) ? moveFrom : ''} onChange={(event) => {
                  const origin = event.target.value
                  const firstBalance = stock.find((row) => row.code === moveCode && row.location === origin && row.boxes > 0)
                  setMoveFrom(origin)
                  setMoveStatus(firstBalance?.status ?? 'Aguardando testagem')
                  if (moveTo === origin) setMoveTo(locations.find((location) => location !== origin) ?? '')
                }}><option value="">Escolha a origem</option>{movementOrigins.map((location) => <option key={location}>{location}</option>)}</select></label>
                <label>Destino<select value={destinationOptions.includes(moveTo) ? moveTo : ''} onChange={(event) => setMoveTo(event.target.value)} required><option value="">Escolha o destino</option>{destinationOptions.map((location) => <option key={location}>{location}</option>)}</select></label>
                <label>Situação<select value={movementStatuses.includes(moveStatus) ? moveStatus : ''} onChange={(event) => setMoveStatus(event.target.value as StockRow['status'])} required><option value="">Escolha a situação</option>{movementStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Quantidade (caixas)<input type="number" min="1" max={availableForTransfer} step="1" value={moveQuantity} onChange={(event) => setMoveQuantity(event.target.value)} required /></label>
                <p className="transfer-available">Disponível na origem nesta situação: <strong>{availableForTransfer} caixas</strong></p>
                <button type="submit">Registrar transferência</button>
                {transferMessage && <p className="transfer-message" role="status">{transferMessage}</p>}
              </form>
            </div>
          </section>

          <section className="summary-grid" aria-label="Resumo do estoque de demonstração">
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
            <article className="summary-card">
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
            </article>
          </section>

          <section className="inventory-panel">
            <form className="add-product-form" onSubmit={handleAddProduct}>
              <div className="form-heading"><h2>Adicionar ao estoque de demonstração</h2><p>Código novo cadastra o produto; código existente adiciona caixas a outra localização. Os dados ficam salvos neste navegador.</p></div>
              <label>Código do produto<input value={newCode} onChange={(event) => setNewCode(event.target.value)} placeholder="ARE-24" required /></label>
              <label>Aplicação (para código novo)<input value={catalog[newCode.trim().toUpperCase()]?.application ?? newApplication} onChange={(event) => setNewApplication(event.target.value)} placeholder="Ex.: Renault — exemplo" disabled={Boolean(catalog[newCode.trim().toUpperCase()])} required={!catalog[newCode.trim().toUpperCase()]} /></label>
              <label>Localização<select value={newLocation} onChange={(event) => setNewLocation(event.target.value)} required><option value="">Escolha a prateleira</option>{locations.map((location) => <option key={location}>{location}</option>)}</select></label>
              <label>Situação<select value={newStatus} onChange={(event) => setNewStatus(event.target.value as StockRow['status'])}><option>Aguardando testagem</option><option>Liberado para venda</option></select></label>
              <label>Quantidade (caixas)<input type="number" min="1" step="1" value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} required /></label>
              <button className="add-product-button" type="submit">Adicionar registro</button>
            </form>
            <div className="panel-heading">
              <div>
                <h2>Estoque por localização</h2>
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
                          <span><strong>{row.code}</strong><small>{catalog[row.code]?.application}</small></span>
                        </div>
                      </td>
                      <td><span className="location-tag">{row.location}</span></td>
                      <td><span className={`status-pill ${row.status === 'Aguardando testagem' ? 'status-waiting' : 'status-released'}`}><span />{row.status}</span></td>
                      <td className="quantity-cell">{row.boxes}<span> cx.</span></td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr><td className="empty-state" colSpan={4}>Nenhum registro encontrado para “{search}”.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="table-note">Demonstração: situação agrupada por caixa (regra ainda a confirmar). Quantidades fictícias em caixas; dados salvos neste navegador. Use “Restaurar dados fictícios” para recomeçar.</p>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
