import {test,expect} from '@playwright/test'
async function seed(page){await page.goto('/offline.html');await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready});await page.reload();await page.evaluate(()=>{const now=Date.now();localStorage.setItem('liber:offline-stock:v1:account','a');localStorage.setItem('liber:offline-stock:v1:a',JSON.stringify({userId:'a',consultedAt:now,expiresAt:now+900000,stock:[{code:'MGM-35',location:'A01',status:'Em estoque',boxes:3}]}))});await page.reload();await page.context().setOffline(true)}
test('rascunho sobrevive à reabertura sem alterar saldo e evita repetição',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'Guardar rascunho offline'}).click();await expect(page.locator('#draft-state')).toContainText('Nenhuma caixa')
 await page.getByRole('button',{name:'Guardar rascunho offline'}).click();await expect(page.locator('#draft-state')).toContainText('Já existe')
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('liber:offline-operations:v1:a')).length)).toBe(1);await expect(page.locator('tbody')).toContainText('3')
})
test('quantidade acima do saldo e consulta expirada não criam rascunho',async({page})=>{
 await seed(page);await page.locator('#boxes').fill('4');await page.getByRole('button',{name:'Guardar rascunho offline'}).click();await expect(page.locator('#draft-state')).toContainText('Confira o saldo')
 expect(await page.evaluate(()=>localStorage.getItem('liber:offline-operations:v1:a'))).toBeNull()
 await page.evaluate(()=>localStorage.removeItem('liber:offline-stock:v1:account'));await page.reload();await expect(page.locator('#draft')).toBeDisabled()
})
