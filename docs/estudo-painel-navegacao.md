# Estudo: painel, navegação e alertas

`dashboardStockSummary(catalog, stock, 'shocks')` soma amortecedores; `'springs'` soma molas. O total soma ambos. A função usa as situações normais de cada produto, excluindo garantia. Os três totais principais não mudam com o filtro dos indicadores.

```tsx
// const dá nome ao resultado calculado nesta renderização.
const shockBoxes = dashboardStockSummary(catalog, stock, 'shocks').boxes
// useState preserva o texto entre renderizações; setSearch atualiza esse estado.
const [search, setSearch] = useState('')
// onChange é chamado quando a pessoa digita; event.target.value é o texto atual.
<input value={search} onChange={(event) => setSearch(event.target.value)} />
// onClick recebe uma função: ela só é executada ao ativar o botão.
// type="button" evita enviar um formulário por engano.
<button type="button" onClick={() => onOpen('springs')}>
  {/* Chaves inserem o valor JavaScript no JSX. */}
  <strong>{springBoxes}</strong>
</button>
```

`onOpen` é uma função recebida do App. `changePage` usa `setActivePage` e o React mostra a tela escolhida. Botões reais permitem Tab, Enter e Espaço, além do mouse.

CSS Grid organiza os totais em colunas; media queries empilham os cartões no celular. O menu móvel permite rolagem horizontal sem apertar os nomes. `:focus-visible` destaca o controle pelo teclado. `:hover` dá retorno ao mouse. Tema escuro usa a mesma hierarquia com cores próprias.

Os alertas têm contagem no menu e uma central que reaproveita as regras existentes. Cada categoria usa um título com ID próprio para evitar duplicação. Os atalhos não modificam permissões no banco.

Arquivos: `InventoryDashboard.tsx` (cartões), `InventoryNavigation.tsx` (Produtos e Alertas), `NavigationIcon.tsx` (SVGs do menu), `InventoryDashboard.css` (apresentação), `App.tsx` (navegação), todos dentro de src/components ou src conforme a função.
