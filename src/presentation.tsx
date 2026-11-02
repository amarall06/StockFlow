import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ShelfCapacity } from './components/ShelfCapacity'
import { demoLocations, demoStock } from './lib/shelf-capacity'
import './Presentation.css'

export function Presentation() {
  const [dark, setDark] = useState(false)
  const total = demoStock.reduce((sum, row) => sum + row.boxes, 0)
  const awaiting = demoStock.filter(row => row.status === 'Aguardando testagem').reduce((sum, row) => sum + row.boxes, 0)
  return <main className={`presentation-shell${dark ? ' theme-dark' : ''}`}>
    <header className="presentation-heading"><div><p>LIBER automotive</p><h1>Apresentação do estoque</h1></div><button type="button" className="theme-toggle" onClick={() => setDark(value => !value)}>{dark ? 'Usar tema claro' : 'Usar tema escuro'}</button></header>
    <p className="presentation-banner"><strong>Todos os dados desta página são fictícios.</strong> Cenário para apresentação: produtos, quantidades, prateleiras, capacidades e divergências de exemplo.</p>
    <section className="presentation-metrics" aria-label="Indicadores fictícios">
      {[['Caixas do exemplo', total], ['Disponíveis no exemplo', total - awaiting], ['Aguardando testagem', awaiting], ['Prateleiras fictícias', demoLocations.length]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </section>
    <section className="inventory-panel" aria-label="Produtos da apresentação"><h2>Produtos fictícios</h2><p>Use estes códigos na busca do mapa. Um mesmo produto pode estar em mais de uma prateleira e situação.</p>
      <ul>{[{ code: 'AGM-35', name: 'Amortecedor de demonstração' }, { code: 'MGM-35', name: 'Mola de demonstração' }].map(product => {
        const rows = demoStock.filter(row => row.code === product.code)
        return <li key={product.code}><strong>{product.code}</strong> — {product.name}; {rows.reduce((sum, row) => sum + row.boxes, 0)} caixas; locais: {[...new Set(rows.map(row => row.location))].join(', ')}.</li>
      })}</ul>
    </section>
    <ShelfCapacity userId="liber-presentation-fictional" locations={demoLocations} stock={demoStock} canEdit demoOnly/>
    <footer><p>Capacidades editadas nesta apresentação ficam salvas somente neste navegador. O desenho é ilustrativo; dados reais poderão substituir o cenário em uma etapa posterior.</p><a href="/">Abrir o sistema LIBER</a></footer>
  </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Presentation/></StrictMode>)
