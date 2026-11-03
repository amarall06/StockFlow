import type {ReactNode} from 'react'
import {Badge} from './Interface'

// Apenas estrutura visual; permissões, eventos e estado continuam no controlador.
export function InventoryLayout({dark,sidebar,mobileNavigation,header,notices,children,overlays}:{dark:boolean;sidebar:ReactNode;mobileNavigation:ReactNode;header:ReactNode;notices:ReactNode;children:ReactNode;overlays:ReactNode}){
 return <main className={`app-shell liber-layout${dark?' theme-dark':''}`}>
  <a className="skip-link" href="#consulta">Ir para o conteúdo</a>
  <aside className="sidebar">{sidebar}</aside>
  {mobileNavigation}
  <section className="main-panel" id="inicio">{notices}<header className="topbar">{header}</header>{children}</section>
  {overlays}
 </main>
}
export function PageHeading({section,title,subtitle,actions}:{section:string;title:string;subtitle:string;actions?:ReactNode}){
 return <div className="page-heading"><div><Badge className="eyebrow">{section}</Badge><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{actions&&<div className="page-heading-actions">{actions}</div>}</div>
}
