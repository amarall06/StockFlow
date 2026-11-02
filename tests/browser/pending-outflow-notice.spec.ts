import {test,expect} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
const userId='11111111-1111-4111-8111-111111111111',requestId='33333333-3333-4333-8333-333333333333'
async function seed(page,phase:'uncertain'|'confirmed') {
  await page.evaluate(({userId,requestId,phase})=>{
    sessionStorage.setItem(`liber.outflow.pending.v1:${userId}`,JSON.stringify({version:1,userId,requestId,phase,input:{row:{code:'MGM-35',location:'A01',status:'Em estoque',boxes:2},boxes:1,reason:'sale',notes:'Conferência de pedido',reference:''}}))
    window.dispatchEvent(new Event('liber:pending-outflow'))
  },{userId,requestId,phase})
}
test('aviso acompanha saída incerta fora de Saídas e abre o pedido original sem enviar',async({page})=>{
  const writes=await prepareKeyboardPage(page)
  await seed(page,'uncertain')
  await openModule(page,'Produtos')
  await expect(page.getByRole('status').filter({hasText:'Há uma saída com confirmação pendente'})).toContainText('pode já ter sido registrada')
  await page.getByRole('button',{name:'Revisar confirmação de saída'}).click()
  await expect(page.getByRole('region',{name:'Pedido de saída pendente'})).toContainText('MGM-35 · A01 · 1 caixas')
  expect(await page.evaluate(id=>JSON.parse(sessionStorage.getItem(`liber.outflow.pending.v1:${id}`)!).requestId,userId)).toBe(requestId)
  await expect(page.getByRole('button',{name:'Conferir pedido pendente',exact:true})).toBeEnabled()
  expect(writes).toEqual([])
})
test('aviso distingue saída confirmada e desaparece após somente atualizar leitura',async({page})=>{
  const writes=await prepareKeyboardPage(page)
  await seed(page,'confirmed')
  await expect(page.getByRole('status').filter({hasText:'Uma saída já confirmada'})).toContainText('Não registre novamente')
  await page.getByRole('button',{name:'Revisar confirmação de saída'}).click()
  await page.getByRole('button',{name:'Atualizar pedido confirmado',exact:true}).click()
  await expect(page.getByRole('button',{name:'Revisar confirmação de saída'})).toHaveCount(0)
  expect(await page.evaluate(id=>sessionStorage.getItem(`liber.outflow.pending.v1:${id}`),userId)).toBeNull()
  expect(writes).toEqual([])
})
test('pedido ilegível é preservado e aviso não expõe pedido de outra conta',async({page})=>{
  await prepareKeyboardPage(page)
  await page.evaluate(id=>{sessionStorage.setItem(`liber.outflow.pending.v1:${id}`,'inválido');window.dispatchEvent(new Event('liber:pending-outflow'))},userId)
  await expect(page.getByRole('status').filter({hasText:'pedido de saída ilegível'})).toContainText('Preserve os dados')
  expect(await page.evaluate(id=>sessionStorage.getItem(`liber.outflow.pending.v1:${id}`),userId)).toBe('inválido')
  await page.evaluate(id=>{sessionStorage.removeItem(`liber.outflow.pending.v1:${id}`);sessionStorage.setItem('liber.outflow.pending.v1:outra-conta','inválido');window.dispatchEvent(new Event('liber:pending-outflow'))},userId)
  await expect(page.getByRole('button',{name:'Revisar confirmação de saída'})).toHaveCount(0)
})
