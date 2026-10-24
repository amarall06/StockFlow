// Mostra a ação disponível: lua para escurecer; sol para voltar ao tema claro.
export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro'
  return <button className="theme-toggle theme-icon-toggle" type="button" onClick={onToggle} aria-pressed={dark} aria-label={label} title={label}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
        : <path d="M20.8 13A8.6 8.6 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />}
    </svg>
  </button>
}
