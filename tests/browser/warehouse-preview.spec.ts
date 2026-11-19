import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'
test('prévia fiel ao desenho, navegação e recarga offline sem acessar saldos',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const remote:string[]=[];page.on('request',r=>{if(r.url().includes('supabase'))remote.push(r.url())})
 await page.goto('/warehouse-preview.html');await expect(page.getByRole('heading',{name:'Prévia do espaço'})).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Selecionar bloco da prévia'}).getByRole('button')).toHaveCount(5)
 await page.getByRole('button',{name:'Bloco 3',exact:true}).click();await expect(page.getByRole('heading',{name:'Bloco 3 — prévia'})).toBeVisible();await expect(page.getByText('Quatro níveis de altura.',{exact:false})).toBeVisible()
 await page.getByRole('button',{name:'Ver de cima',exact:true}).click();await expect(page.getByRole('button',{name:'Ver em 3D',exact:true})).toBeVisible()
 await page.getByRole('slider',{name:'Girar visão'}).fill('35');await page.getByRole('button',{name:'Restaurar visão'}).click()
 await page.screenshot({path:'test-results/warehouse-preview-desktop.png',fullPage:true})
 await page.setViewportSize({width:375,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.getByRole('button',{name:'Bloco 5',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Bloco 5 — prévia'})).toBeVisible()
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true)
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Prévia do espaço'})).toBeVisible();await expect(page.getByRole('status')).toContainText('Offline')
 await page.getByRole('button',{name:'Bloco 2',exact:true}).click();await expect(page.getByRole('heading',{name:'Bloco 2 — prévia'})).toBeVisible()
 await page.goto('/offline.html');await page.getByRole('link',{name:'Mapa 3D do novo galpão — prévia'}).click();await expect(page.getByRole('heading',{name:'Prévia do espaço'})).toBeVisible()
 expect(errors).toEqual([]);expect(remote).toEqual([])
})
test('prévia integrada à ocupação sem depender da configuração antiga',async({page})=>{
 await prepareKeyboardPage(page)
 await page.locator('.dashboard-quicknav > summary').click();await page.getByRole('button',{name:'Planta e capacidades',exact:true}).click()
 await expect(page.frameLocator('iframe[title="Mapa 3D ilustrativo do novo galpão"]').getByRole('heading',{name:'Prévia do espaço'})).toBeVisible({timeout:20000})
})
