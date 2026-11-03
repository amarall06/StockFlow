// Ícones vetoriais mantêm o mesmo traço e tamanho em todos os itens do menu.
const paths:Record<string,string>={
  map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z M9 3v16 M15 5v16',
  download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  filter:'M3 5h18 M6 12h12 M9 19h6 M8 3v4 M16 10v4 M12 17v4',
  dashboard:'M3 10l9-8 9 8 M5 9v12h14V9',
  inventory:'M5 21V12 M12 21V3 M19 21V8',
  alerts:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
  products:'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  turnover:'M3 3v18h18 M7 16v-4 M12 16V8 M17 16V5 M5 9l5-4 5 2 5-4',
  warranty:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z',
  springs:'M7 3h10 M7 7l10 3-10 4 10 3-10 4 M7 3v4 M17 17v4',
  outflow:'M3 12h17 M14 6l6 6-6 6',
  history:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  catalog:'M4 16l2-9h12l2 9 M3 16h18v4H3z M6 20v2 M18 20v2',
}
export function NavigationIcon({name}:{name:string}){
  return <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.products}/></svg>
}
