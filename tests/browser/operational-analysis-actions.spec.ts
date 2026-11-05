import{test,expect,type Page}from'@playwright/test'
import AxeBuilder from'@axe-core/playwright'
import{prepareRedesign}from'./helpers/redesign'
async function prepare(page:Page,theme:'light'|'dark'='light',layoutFailure=false){
 const state=await prepareRedesign(page,theme),calls:string[]=[]
 if(layoutFailure){
  await page.route('**/rest/v1/inventory_layouts*',route=>route.fulfill({status:403,json:{message:'Indisponível'}}))
  await page.reload();await expect(page.locator('.dashboard-stock-totals')).toBeVisible()
 }
 const stamp=new Date(Date.now()-86400000).toISOString()
 const movements=[
  {id:'a1',created_at:stamp,quantity:10,product:{code:'AGM-35'},origin:null,destination:{code:'NORTE'}},
  {id:'a2',created_at:stamp,quantity:4,product:{code:'AGM-35'},origin:{code:'NORTE'},destination:{code:'SUL'}},
  {id:'a3',created_at:stamp,quantity:6,product:{code:'MGM-35'},origin:null,destination:{code:'SUL'}},
  {id:'a4',created_at:stamp,quantity:2,product:{code:'AGM-41'},origin:{code:'LESTE'},destination:{code:'LESTE'}},
 ]
 let failing=false
 await page.route('**/rest/v1/stock_movements*',route=>{
  const url=new URL(route.request().url());calls.push(url.search)
  if(failing)return route.fulfill({status:403,json:{message:'Falha controlada'}})
  const code=url.searchParams.get('product.code')
  if(code)return route.fulfill({json:code==='eq.MGM-44'?[{created_at:'2025-01-02T12:00:00Z',product:{code:'MGM-44'}}]:[]})
  return route.fulfill({json:Number(url.searchParams.get('offset'))>0?[]:movements})
 })
 await page.locator('.dashboard-quicknav summary').click();await page.getByRole('button',{name:'Análises e conferências',exact:true}).click()
 await page.getByRole('combobox',{name:/^Período de atividade/}).selectOption('30')
 await expect(page.locator('.insights-region')).toHaveCount(4)
 await expect(page.locator('.insights-region').filter({hasText:'NORTE'})).toContainText('2 operações · 14 caixas')
 return{...state,calls,setFail:()=>{failing=true}}
}
test('23: ordenar pela última movimentação coloca histórico antigo antes de datas recentes e desconhecidas', async ({page}) => {
 const state = await prepare(page)
 const calls = state.calls.length
 await page.getByLabel('Ordenar produtos').selectOption('oldest')
 const rows = page.getByRole('table', {name:'Última movimentação dos produtos com saldo'}).locator('tbody tr')
 await expect(rows.first()).toContainText('MGM-44')
 await expect(rows.nth(1)).toContainText('AGM-35')
 await expect(rows.last()).toContainText('Sem histórico disponível')
 await page.getByLabel('Somente sem movimentação no período').check()
 await expect(rows.first()).toContainText('MGM-44')
 await expect(rows).toHaveCount(5)
 expect(state.calls).toHaveLength(calls)
 expect(state.writes).toEqual([])
})
test('20: atividade operacional por região, métrica e atalho para a planta correta',async({page})=>{
 const state=await prepare(page)
 const north=page.locator('.insights-region').filter({hasText:'NORTE'}),west=page.locator('.insights-region').filter({hasText:'OESTE'})
 await expect(north).toContainText('100% de intensidade');await expect(west).toContainText('Sem atividade no período')
 const count=state.calls.length
 await page.getByRole('combobox',{name:/^Intensidade do mapa de calor/}).selectOption('boxes')
 await expect(page.locator('.insights-region').filter({hasText:'SUL'})).toContainText('71% de intensidade')
 expect(state.calls).toHaveLength(count)
 await north.getByRole('button',{name:'Ver NORTE na planta ↗',exact:true}).click()
 const rack=page.locator('#dashboard-map .map-shelf[data-location=NORTE]')
 await expect(rack).toHaveAttribute('aria-pressed','true');await expect(rack).toBeFocused()
 await expect(page.locator('#dashboard-map')).toContainText('Prateleira NORTE — detalhes')
 await expect(page.locator('#dashboard-map')).toContainText('Saldo completo: 23 caixas')
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('23: lista filtrável e CSV exportam só os produtos selecionados, com histórico anterior',async({page})=>{
 const state=await prepare(page)
 await page.getByLabel('Somente sem movimentação no período',{exact:true}).check()
 await expect(page.locator('.insights-result-count')).toHaveText('5 produtos na lista')
 await page.getByRole('searchbox',{name:'Buscar produto ou região',exact:true}).fill('MGM-44')
 await expect(page.getByRole('table',{name:'Última movimentação dos produtos com saldo'}).locator('tbody tr')).toHaveCount(1)
 const downloadPromise=page.waitForEvent('download')
 await page.locator('.insights-product-tools').getByRole('button',{name:'Exportar CSV',exact:true}).click()
 const download=await downloadPromise,stream=await download.createReadStream();expect(stream).not.toBeNull()
 const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk))
 const csv=Buffer.concat(chunks).toString('utf8')
 expect(csv).toContain('"MGM-44";4;"LESTE";"2025-01-02T12:00:00Z";"Não"')
 expect(csv).toContain('"Amortecedores e molas"');expect(csv).not.toContain('"AGM-35"')
 await page.getByRole('searchbox',{name:'Buscar produto ou região',exact:true}).fill('OESTE')
 await expect(page.locator('.insights-result-count')).toHaveText('2 produtos na lista')
 await page.getByRole('searchbox',{name:'Buscar produto ou região',exact:true}).fill('Aplicação cadastrada 2')
 await expect(page.getByRole('table',{name:'Última movimentação dos produtos com saldo'})).toContainText('AFI-89')
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
for(const theme of ['light','dark'] as const)test(`20/23 ${theme}: visual responsivo, teclado e contraste`,async({page})=>{
 await page.setViewportSize({width:375,height:812});const state=await prepare(page,theme)
 const insights=page.locator('.inventory-insights')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect((await new AxeBuilder({page}).include('.inventory-insights').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 await insights.screenshot({path:`docs/design/analises-${theme}-mobile.png`})
 const button=page.locator('.insights-region').filter({hasText:'OESTE'}).getByRole('button')
 await button.focus();await page.keyboard.press('Enter')
 await expect(page.locator('#dashboard-map .map-shelf[data-location=OESTE]')).toBeFocused()
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('20/23: filtro sem resultado, categoria e período mantêm o contexto da análise',async({page})=>{
 const state=await prepare(page)
 await page.getByRole('searchbox',{name:'Buscar produto ou região',exact:true}).fill('não-encontrado')
 await expect(page.getByText('Nenhum produto corresponde aos filtros desta lista.',{exact:true})).toBeVisible()
 await expect(page.locator('.insights-product-tools').getByRole('button',{name:'Exportar CSV',exact:true})).toBeDisabled()
 await page.getByRole('searchbox',{name:'Buscar produto ou região',exact:true}).clear()
 await page.getByLabel('Somente sem movimentação no período',{exact:true}).check()
 await page.locator('#dashboard-filters>summary').click();await page.getByRole('combobox',{name:/^Filtrar indicadores/}).selectOption('springs')
 await expect(page.locator('.insights-result-count')).toHaveText('3 produtos na lista')
 await page.getByRole('combobox',{name:/^Período de atividade/}).selectOption('90')
 await expect(page.locator('.insights-result-count')).toHaveText('3 produtos na lista')
 await expect(page.getByLabel('Somente sem movimentação no período',{exact:true})).toBeChecked()
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('20: planta indisponível informa a falha sem abrir região de exemplo',async({page})=>{
 const state=await prepare(page,'light',true)
 await page.getByRole('button',{name:'Ver NORTE na planta ↗',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'A planta operacional ainda não está disponível para esta região.'})).toBeVisible()
 await expect(page.locator('#dashboard-map .map-shelf')).toHaveCount(0)
 expect(state.writes).toEqual([])
})
