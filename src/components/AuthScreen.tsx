import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function AuthScreen({ dark, onToggle, children }: { dark: boolean; onToggle: () => void; children: ReactNode }) {
  return <main className={`auth-screen${dark ? ' theme-dark' : ''}`}><div className="auth-theme-toggle"><ThemeToggle dark={dark} onToggle={onToggle} /></div>{children}</main>
}

export function Brand() {
  return <div className="auth-brand"><span className="brand-mark">L</span><span>LIBER<span className="brand-light"> automotive</span></span></div>
}
