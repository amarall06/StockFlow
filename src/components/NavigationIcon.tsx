// Ícones vetoriais mantêm o mesmo traço e tamanho em todos os itens do menu.
const paths:Record<string,string>={
  dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  inventory:'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  alerts:'M12 3L2 21h20L12 3z M12 9v5 M12 17h.01',
  products:'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
  turnover:'M3 3v18h18 M7 16v-4 M12 16V8 M17 16V5 M5 9l5-4 5 2 5-4',
  warranty:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  springs:'M7 3h10 M7 7l10 3-10 4 10 3-10 4 M7 3v4 M17 17v4',
  outflow:'M4 5h9v14H4z M10 12h11 M17 8l4 4-4 4',
  history:'M3 11a9 9 0 1 1 2 7 M3 5v6h6 M12 7v5l3 2',
  catalog:'M4 4h16v16H4z M8 4v16 M12 8h5 M12 12h5 M12 16h3',
}
export function NavigationIcon({name}:{name:string}){
  return <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.products}/></svg>
}
