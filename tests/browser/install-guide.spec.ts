import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'

async function openGuide(page) {
  await page.getByLabel('Opções da conta').click()
  await page.getByRole('button',{name:'Como instalar no computador ou celular',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Instalar o LIBER',exact:true})
  await expect(dialog).toBeVisible()
  return dialog
}
test('instruções existem sem convite automático e explicam os três aparelhos e limites offline',async({page})=>{
  const writes=await prepareKeyboardPage(page)
  const dialog=await openGuide(page)
  await expect(dialog.getByRole('heading',{name:'Windows — Chrome ou Edge'})).toBeVisible()
  await expect(dialog.getByRole('heading',{name:'Android — Chrome'})).toBeVisible()
  await expect(dialog.getByRole('heading',{name:'iPhone — Safari'})).toBeVisible()
  await expect(dialog).toContainText('não transfere rascunhos locais entre aparelhos')
  await expect(dialog).toContainText('vale por até 15 minutos')
  await expect(dialog).toContainText('rascunhos não confirmam alterações')
  await expect(dialog.getByRole('button',{name:'Instalar aplicativo',exact:true})).toHaveCount(0)
  for(const link of await dialog.getByRole('link').all()){await expect(link).toHaveAttribute('rel','noopener noreferrer');await expect(link).toHaveAttribute('target','_blank')}
  expect(writes).toEqual([])
})
test('convite recebido com guia aberto aparece no próprio diálogo e aguarda ação da pessoa',async({page})=>{
  await prepareKeyboardPage(page);const dialog=await openGuide(page)
  await page.evaluate(()=>{
    const state=window as Window&{guideInstallRequests:number};state.guideInstallRequests=0
    const event=new Event('beforeinstallprompt',{cancelable:true})
    Object.assign(event,{prompt:async()=>{state.guideInstallRequests++},userChoice:Promise.resolve({outcome:'dismissed'})})
    window.dispatchEvent(event)
  })
  const button=dialog.getByRole('button',{name:'Instalar aplicativo',exact:true})
  await expect(button).toBeVisible()
  expect(await page.evaluate(()=>(window as Window&{guideInstallRequests:number}).guideInstallRequests)).toBe(0)
  await button.click();await expect(button).toHaveCount(0)
  expect(await page.evaluate(()=>(window as Window&{guideInstallRequests:number}).guideInstallRequests)).toBe(1)
  await expect(dialog.getByRole('heading',{name:'iPhone — Safari'})).toBeVisible()
})
test('falha de instalação é anunciada no guia e conserva a alternativa manual',async({page})=>{
  await prepareKeyboardPage(page);const dialog=await openGuide(page)
  await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});Object.assign(event,{prompt:async()=>{throw Error('Falha simulada')},userChoice:Promise.resolve({outcome:'dismissed'})});window.dispatchEvent(event)})
  await dialog.getByRole('button',{name:'Instalar aplicativo',exact:true}).click()
  await expect(dialog.getByRole('alert')).toContainText('Tente pelo menu do navegador')
  await expect(dialog.getByRole('heading',{name:'Android — Chrome'})).toBeVisible()
  await dialog.getByRole('button',{name:'Fechar instruções'}).click()
  await expect(page.getByRole('status').filter({hasText:'Não foi possível abrir a instalação.'})).toBeVisible()
})
for(const theme of ['light','dark'])test(`guia em 375 px, teclado e auditoria A/AA no tema ${theme}`,async({page})=>{
  await page.setViewportSize({width:375,height:812})
  await page.addInitScript(value=>localStorage.setItem('liber-automotive-theme',value),theme)
  await prepareKeyboardPage(page);const dialog=await openGuide(page)
  const close=dialog.getByRole('button',{name:'Fechar instruções'})
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab');await expect(dialog.getByRole('link',{name:'Ajuda oficial do Chrome (nova aba)',exact:true})).toBeFocused()
  const audit=await new AxeBuilder({page}).include('.install-guide-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(audit.violations.map(row=>({id:row.id,targets:row.nodes.map(node=>node.target)}))).toEqual([])
  const bounds=await dialog.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(375)
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Como instalar no computador ou celular',exact:true})).toBeFocused()
})
