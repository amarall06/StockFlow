import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'
import AxeBuilder from '@axe-core/playwright'

test('sete blocos, destaque pelo mouse e endereço por divisão e altura, sem informações antes do clique',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/warehouse-preview.html')
 await expect(page.getByRole('navigation',{name:'Selecionar bloco'}).getByRole('button')).toHaveCount(7)
 await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByText(/Embalagem|Portas|Sem escala real/)).toHaveCount(0)
 const canvas=page.locator('canvas'),box=(await canvas.boundingBox())!;await page.mouse.move(box.x+319/1000*box.width,box.y+245/1000*box.height);await expect(canvas).toHaveAttribute('data-hovered-block','1')
 await page.mouse.move(0,0);await expect(canvas).toHaveAttribute('data-hovered-block','')
 await page.getByRole('button',{name:'Bloco 1',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:/^T03-[A-C]-[1-4]$/})).toHaveCount(12);await expect(dialog.getByRole('button',{name:'T03-D-1',exact:true})).toHaveCount(0)
 await expect(page.locator('#products')).not.toBeVisible();await dialog.getByRole('button',{name:'T03-A-1',exact:true}).click();await expect(dialog.getByRole('heading',{name:'T03-A-1',exact:true})).toBeVisible();await dialog.getByLabel('Face',{exact:true}).selectOption('T04');await expect(page.locator('#products')).not.toBeVisible();await expect(dialog.getByRole('button',{name:'T04-C-4',exact:true})).toBeVisible()
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Bloco 1',exact:true})).toBeFocused()
 await page.getByRole('button',{name:'Bloco 7',exact:true}).click();await expect(dialog.getByRole('button',{name:/^T15-[A-D]-[1-4]$/})).toHaveCount(16);await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/warehouse-seven-blocks.png',fullPage:true});expect(errors).toEqual([])
})

test('Painel usa só mapa novo e produtos só aparecem no endereço clicado, filtrando molas',async({page})=>{
 await prepareKeyboardPage(page,{locations:[{id:'l1',code:'T03-A-1',is_active:true},{id:'l2',code:'T03-B-2',is_active:true}]})
 await page.locator('.dashboard-quicknav > summary').click();await page.getByRole('button',{name:'Mapa 3D',exact:true}).click()
 await expect(page.getByRole('region',{name:'Sincronização da planta e capacidades',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Ocupação operacional compartilhada',exact:true})).toHaveCount(0);await expect(page.locator('.map-shelf')).toHaveCount(0)
 const frame=page.frameLocator('iframe[title="Mapa 3D ilustrativo do novo galpão"]');await frame.getByRole('button',{name:'Bloco 1',exact:true}).click();await expect(frame.locator('#products')).not.toBeVisible();await frame.getByRole('button',{name:'T03-A-1',exact:true}).click();await expect(frame.locator('#product-rows')).toContainText('AGM-35');await expect(frame.locator('#product-rows')).not.toContainText('MGM-35');await frame.getByRole('button',{name:'T03-B-2',exact:true}).click();await expect(frame.locator('#product-rows')).not.toContainText('AGM-35');await expect(frame.locator('#product-rows')).toContainText('Sem amortecedores vinculados')
})

test('endereços e navegação continuam offline e acessíveis em tela pequena',async({page,context})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/warehouse-preview.html');await page.evaluate(async()=>{await navigator.serviceWorker.ready});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await expect(page.getByRole('status')).toContainText('Offline');await page.getByRole('button',{name:'Bloco 6',exact:true}).click();await page.getByRole('button',{name:'T13-D-1',exact:true}).click();await expect(page.getByRole('heading',{name:'T13-D-1',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations.map(v=>v.id)).toEqual([])
 await page.screenshot({path:'test-results/warehouse-address-mobile.png',fullPage:true})
})
