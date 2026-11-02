import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
for(const theme of ['light','dark']) for(const module of ['Visão geral','Garantia','Saídas','Histórico','Aplicações','Produtos','Minha conta']) {
  test(`auditoria inédita de campos e contraste em ${module}, tema ${theme}`,async({page})=>{
    await page.setViewportSize({width:375,height:812})
    await page.addInitScript(value=>localStorage.setItem('liber-automotive-theme',value),theme)
    const writes=await prepareKeyboardPage(page)
    const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
    if(module==='Minha conta')await page.getByRole('button',{name:'Abrir meu perfil',exact:true}).click()
    else {await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('dialog',{name:'Menu de navegação'}).getByRole('button',{name:module,exact:true}).click()}
    await expect(page.locator('#consulta h1')).toBeVisible()
    const audit=await new AxeBuilder({page}).include('#consulta').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
    expect(audit.violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))).toEqual([])
    expect(writes).toEqual([])
  })
}
