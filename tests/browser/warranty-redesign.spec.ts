import{test,expect}from'@playwright/test'
import AxeBuilder from'@axe-core/playwright'
import{prepareWarrantyRedesign,openRedesignModule}from'./helpers/warranty-redesign'
import{prepareRedesign}from'./helpers/redesign'
for(const theme of ['light','dark'] as const)for(const mobile of [false,true])test(`Garantia ${theme} ${mobile?'celular':'desktop'}: layout, dados e acessibilidade`,async({page})=>{
 await page.setViewportSize(mobile?{width:375,height:812}:{width:1440,height:1000})
 const state=await prepareWarrantyRedesign(page,theme)
 await expect(page.locator('.warranty-more')).not.toHaveAttribute('open')
 await expect(page.getByRole('table',{name:'Casos de garantia'}).locator('tbody>tr:not([hidden])')).toHaveCount(5)
 await expect(page.getByRole('table',{name:'Casos de garantia'})).toContainText('Vazamento de óleo')
 await expect(page.locator('.reference-warranty h1')).toHaveCSS('font-size',mobile?'30px':'40px')
 if(!mobile)await expect(page.locator('.warranty-metrics .ui-card').first()).toHaveCSS('height','112px')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 if(mobile)expect(await page.locator('.warranty-returns .ui-table-scroll').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true)
 await page.locator('h1').click();await page.screenshot({path:`docs/design/garantia-${theme}${mobile?'-mobile':''}.png`,fullPage:true})
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('Garantia: tabela abre os detalhes completos, filtros e edição preservada',async({page})=>{
 const state=await prepareWarrantyRedesign(page)
 const details=page.getByRole('button',{name:'Detalhes da devolução AGM-35',exact:true})
 await details.focus();await page.keyboard.press('Enter');await expect(details).toHaveAttribute('aria-expanded','true')
 await expect(page.locator('.warranty-detail-row:visible')).toContainText('Confirmada como nossa')
 await expect(page.locator('.warranty-detail-row:visible')).toContainText('Peça recebida 1')
 await page.getByRole('button',{name:'Atualizar devolução AGM-35',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Descrição do que chegou')).toHaveValue('Peça recebida 1')
 await page.keyboard.press('Escape')
 await page.locator('.warranty-filters summary').click();await page.getByLabel('Buscar devolução',{exact:true}).fill('AGM-35')
 await expect(page.getByRole('button',{name:/Detalhes da devolução/})).toHaveCount(1)
 await page.locator('.warranty-filters select').selectOption('closed');await expect(page.getByText('Nenhuma devolução encontrada.',{exact:true})).toBeVisible()
 await expect(page.locator('.warranty-metrics strong')).toHaveText(['2','2','1'])
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('Garantia: edição de um caso aberto cabe na área visível em 360px',async({page})=>{
 await page.setViewportSize({width:360,height:800})
 const state=await prepareWarrantyRedesign(page,'dark')
 await page.getByRole('button',{name:'Detalhes da devolução AGM-35',exact:true}).press('Enter')
 const scroll=page.locator('.warranty-returns .ui-table-scroll')
 const edit=scroll.getByRole('button',{name:'Atualizar devolução AGM-35',exact:true})
 await expect(edit).toBeVisible()
 const bounds=await scroll.boundingBox(),action=await edit.boundingBox()
 expect(action!.x).toBeGreaterThanOrEqual(bounds!.x)
 expect(action!.x+action!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width)
 await edit.click()
 await expect(page.getByRole('dialog')).toBeVisible()
 await page.keyboard.press('Escape')
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('Garantia: Novo registro abre o formulário existente e cabe no celular',async({page})=>{
 await page.setViewportSize({width:320,height:812});const state=await prepareWarrantyRedesign(page,'dark')
 await page.getByRole('button',{name:'Novo registro',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Receber devolução'})
 await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Descrição do que chegou')).toBeEditable()
 expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(320)
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('Garantia: atalho abre fabricantes, CSV e diálogos de saldo sem mudar os dados',async({page})=>{
 const state=await prepareWarrantyRedesign(page)
 await page.locator('.warranty-shortcuts summary').click();await page.getByRole('button',{name:'Fabricantes, saldos e exportação',exact:true}).click()
 await expect(page.locator('.warranty-more')).toHaveAttribute('open','');await expect(page.locator('#manufacturers-title')).toBeFocused()
 await page.getByRole('button',{name:'Editar fabricante Marca cadastrada',exact:true}).click();await expect(page.getByLabel('Editar fabricante',{exact:true})).toHaveValue('Marca cadastrada')
 await page.getByRole('button',{name:'Cancelar edição',exact:true}).click()
 for(const direction of ['Adicionar caixas em Marca cadastrada','Retirar caixas de Marca cadastrada']){
  await page.getByRole('button',{name:direction,exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
 }
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();expect((await download).suggestedFilename()).toContain('liber-garantia-fabricantes')
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('Garantia: consulta sem permissão de escrita e catálogo de casos vazio',async({page})=>{
 const state=await prepareWarrantyRedesign(page)
 await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,display_name:'Consulta',role:'viewer'}}))
 await page.route('**/rest/v1/warranty_returns*',route=>route.fulfill({json:[]}))
 await page.reload();await expect(page.locator('.dashboard-stock-totals')).toBeVisible();await openRedesignModule(page,'warranty')
 await expect(page.locator('.warranty-metrics strong')).toHaveText(['0','0','0'])
 await expect(page.getByRole('button',{name:'Novo registro',exact:true})).toHaveCount(0)
 await expect(page.getByText('Nenhuma devolução encontrada.',{exact:true})).toBeVisible()
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
test('Garantia: carga e falha não mostram contagens falsas',async({page})=>{
 await prepareRedesign(page)
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/rest/v1/warranty_returns*',async route=>{await gate;await route.fulfill({status:403,json:{message:'Falha simulada'}})})
 await openRedesignModule(page,'warranty');await expect(page.getByText('Carregando devoluções…',{exact:true})).toBeVisible()
 await expect(page.locator('.warranty-metrics strong')).toHaveText(['—','—','—']);release()
 await expect(page.getByRole('alert').filter({hasText:'Não foi possível carregar as devoluções.'})).toBeVisible()
 await expect(page.locator('.warranty-metrics strong')).toHaveText(['—','—','—'])
})

test('Garantia: métricas alinhadas, detalhes encerrados e acabamento em 320px e tablet',async({browser})=>{
 test.setTimeout(90000)
 for(const theme of ['light','dark'] as const)for(const width of [1440,375,320,768]){
  const context=await browser.newContext({baseURL:test.info().project.use.baseURL,viewport:{width,height:1000}})
  try{
   const page=await context.newPage(),state=await prepareWarrantyRedesign(page,theme)
   if(width===1440){expect((await page.locator('.warranty-metrics .ui-card').first().boundingBox())!.height).toBe(112)}
   await expect(page.locator('.warranty-metrics .ui-card').last()).toContainText('1registro')
   await page.getByRole('button',{name:'Detalhes da devolução AGM-52',exact:true}).click()
   await expect(page.locator('.warranty-detail-row:visible')).toContainText('Entregue ao responsável')
   await expect(page.locator('.warranty-detail-row:visible').getByRole('button',{name:/Atualizar devolução/})).toHaveCount(0)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   if(width===1440||width===375){
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('button',{name:'Detalhes da devolução AGM-52',exact:true}).click();await page.locator('h1').click()
    await page.screenshot({path:`docs/design/garantia-${theme}${width===375?'-mobile':''}.png`,fullPage:true})
   }
   expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
  }finally{await context.close()}
 }
})
