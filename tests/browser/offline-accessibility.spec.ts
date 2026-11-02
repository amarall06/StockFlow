import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function prepare(page,context) {
  await page.goto('/offline.html')
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready})
  await page.reload()
  await page.evaluate(()=>{
    const now=Date.now(),userId='conta-acessibilidade',location='PRATELEIRA-'+ 'A'.repeat(80)
    localStorage.setItem('liber:offline-stock:v1:account',userId)
    localStorage.setItem('liber:offline-stock:v1:'+userId,JSON.stringify({userId,consultedAt:now,expiresAt:now+900000,stock:[{code:'MGM-35',location,status:'Em estoque',boxes:2}],locations:[location,'A02'],suppliers:{expiresAt:now+900000,rows:[{id:'fornecedor',name:'Fornecedor '+ 'Nome longo '.repeat(9)}]},warranty:{expiresAt:now+900000,rows:[{id:'fabricante',name:'Fabricante '+ 'Nome longo '.repeat(9),shock_boxes:1,spring_boxes:2}]}}))
  })
  await context.setOffline(true)
  await page.goto('/')
}
test('página offline cabe em 375 px com nomes longos e controles legíveis e alcançáveis',async({page,context})=>{
  await page.setViewportSize({width:375,height:812})
  await prepare(page,context)
  const dimensions=await page.locator('input, select, button').evaluateAll(elements=>elements.map(element=>{const rect=element.getBoundingClientRect();return{id:element.id,left:rect.left,right:rect.right,height:rect.height,font:parseFloat(getComputedStyle(element).fontSize)}}))
  expect(dimensions.length).toBeGreaterThan(35)
  for(const control of dimensions){expect(control.left,control.id).toBeGreaterThanOrEqual(0);expect(control.right,control.id).toBeLessThanOrEqual(375);expect(control.height,control.id).toBeGreaterThanOrEqual(44);expect(control.font,control.id).toBeGreaterThanOrEqual(16)}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const scroll=page.getByRole('region',{name:'Rolagem do estoque offline'})
  expect(await scroll.evaluate(element=>element.scrollWidth>element.clientWidth)).toBe(true)
  await scroll.focus();await expect(scroll).toBeFocused()
  expect(await page.evaluate(()=>getComputedStyle(document.activeElement!).outlineStyle)).toBe('solid')
})
test('atalhos de teclado pulam ao conteúdo e à operação escolhida sem criar rascunhos',async({page,context})=>{
  await prepare(page,context)
  await page.keyboard.press('Tab')
  const skip=page.getByRole('link',{name:'Ir para o conteúdo offline'})
  await expect(skip).toBeFocused();await page.keyboard.press('Enter')
  await expect(page.locator('#offline-main')).toBeFocused()
  const nav=page.getByRole('navigation',{name:'Atalhos das operações offline'})
  for(const [name,id,first] of [['Saídas','offline-saidas','draft-reason'],['Testagem','offline-testagem','test-source'],['Fornecedor ou fabricante','offline-cadastro','registration-kind']]){
    await nav.getByRole('link',{name,exact:true}).focus();await page.keyboard.press('Enter')
    await expect(page.locator('#'+id)).toBeFocused()
    await page.keyboard.press('Tab');await expect(page.locator('#'+first)).toBeFocused()
  }
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('liber:')&&!key.startsWith('liber:offline-stock:')))).toEqual([])
})
test('auditoria nova de acessibilidade da página offline não encontra falhas WCAG A/AA',async({page,context})=>{
  await prepare(page,context)
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations.map(row=>({id:row.id,impact:row.impact,nodes:row.nodes.map(node=>node.target)}))).toEqual([])
})
