import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { StockPresentation } from './components/StockPresentation'
import './Presentation.css'
export function Presentation() {
  const [dark, setDark] = useState(false)
  return <main className={`presentation-shell${dark ? ' theme-dark' : ''}`}>
    <header className="presentation-heading"><div><p>LIBER automotive</p><h1>Apresentação do estoque</h1></div><button type="button" className="theme-toggle" onClick={() => setDark(value => !value)}>{dark ? 'Usar tema claro' : 'Usar tema escuro'}</button></header>
    <StockPresentation userId="liber-presentation-fictional" canEdit/>
    <footer><a href="/">Abrir o sistema LIBER</a></footer>
  </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Presentation/></StrictMode>)
