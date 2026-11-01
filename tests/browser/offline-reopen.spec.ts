import {test,expect} from '@playwright/test'
const prefix='liber:offline-stock:v1:'
async function prepare(page){
 await page.goto('/offline.html')
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready})
 await page.reload()
 await page.evaluate(()=>{const now=Date.now();localStorage.setItem('liber:offline-stock:v1:account','account-a');localStorage.setItem('liber:offline-stock:v1:account-a',JSON.stringify({userId:'account-a',consultedAt:now,expiresAt:now+900000,stock:[{code:'AGM-35',location:'A01',status:'Aguardando testagem',boxes:3},{code:'MGM-35',location:'B02',status:'Em estoque',boxes:2}]}))})
}
test('reabrir sem rede oferece consulta e filtro sem operações de escrita',async({page,context})=>{
 await prepare(page);await context.setOffline(true);await page.goto('/')
 await expect(page.getByRole('heading',{name:'Consulta offline do estoque'})).toBeVisible()
 await expect(page.locator('tbody tr')).toHaveCount(2)
 await page.getByRole('searchbox').fill('B02');await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('tbody')).toContainText('MGM-35')
 await expect(page.locator('form')).toHaveCount(0)
})
test('consulta expirada é removida ao reabrir',async({page,context})=>{
 await prepare(page);await page.evaluate(()=>{const key='liber:offline-stock:v1:account-a';const value=JSON.parse(localStorage.getItem(key));value.consultedAt=Date.now()-900001;value.expiresAt=value.consultedAt+900000;localStorage.setItem(key,JSON.stringify(value))})
 await context.setOffline(true);await page.goto('/');await expect(page.locator('#state')).toContainText('Não há consulta offline válida');await expect(page.locator('tbody tr')).toHaveCount(0)
})
test('troca de identidade não expõe consulta anterior e exclusão limpa o aparelho',async({page})=>{
 await prepare(page);await page.evaluate(()=>localStorage.setItem('liber:offline-stock:v1:account','account-b'));await page.reload();await expect(page.locator('tbody tr')).toHaveCount(0)
 await prepare(page);await page.reload();await expect(page.locator('tbody tr')).toHaveCount(2);await page.getByRole('button',{name:'Apagar consulta deste aparelho'}).click();await expect(page.locator('tbody tr')).toHaveCount(0)
})
