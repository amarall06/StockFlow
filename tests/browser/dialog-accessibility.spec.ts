import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
const dialogs=[
  {module:'Visão geral',trigger:'Configurar mínimos',title:'Configurar estoque mínimo'},
  {module:'Visão geral',trigger:'Ver testagem de AGM-35',title:'Testagem · AGM-35'},
  {module:'Garantia',trigger:'Adicionar caixas em Fabricante teste',title:'Adicionar caixas · Fabricante teste'},
  {module:'Garantia',trigger:'Retirar caixas de Fabricante teste',title:'Retirar caixas · Fabricante teste'},
  {module:'Garantia',trigger:'Receber devolução',title:'Receber devolução'},
  {module:'Aplicações',trigger:'Ver histórico completo de AGM-35',title:'Histórico completo · AGM-35'},
  {module:'Produtos',trigger:'Ampliar foto de AGM-35 — exemplo ilustrativo',title:'AGM-35'},
]
for(const theme of ['light','dark']) {
  for(const item of dialogs) test(`auditoria inédita A/AA do diálogo ${item.title} em ${theme} e 375 px`,async({page})=>{
    await page.setViewportSize({width:375,height:812})
    await page.addInitScript(theme=>localStorage.setItem('liber-automotive-theme',theme),theme)
    const writes=await prepareKeyboardPage(page)
    const closeNotice=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true})
    if(await closeNotice.isVisible()) await closeNotice.click()
    await page.getByRole('button',{name:'Menu',exact:true}).click()
    await page.getByRole('dialog',{name:'Menu de navegação'}).getByRole('button',{name:item.module,exact:true}).click()
    await page.getByRole('button',{name:item.trigger,exact:true}).click()
    const dialog=page.getByRole('dialog',{name:item.title,exact:true})
    await expect(dialog).toBeVisible()
    const audit=await new AxeBuilder({page}).include('dialog[open]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    expect(audit.violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))).toEqual([])
    const bounds=await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(375)
    expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
    expect(writes).toEqual([])
  })
  test(`auditoria inédita da contagem preenchida em ${theme}`,async({page})=>{
    await page.addInitScript(theme=>localStorage.setItem('liber-automotive-theme',theme),theme)
    const writes=await prepareKeyboardPage(page)
    await openModule(page,'Visão geral');await page.locator('#shelf-count > summary').click()
    await page.getByLabel('Prateleira para contar').selectOption('A01');await page.getByRole('button',{name:'Iniciar contagem local'}).click()
    await page.getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true}).fill('1')
    const audit=await new AxeBuilder({page}).include('#shelf-count').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    expect(audit.violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))).toEqual([])
    expect(writes).toEqual([])
  })
}
