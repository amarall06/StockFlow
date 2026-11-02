import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'

const chart=page=>page.getByRole('region',{name:'Ocupação por capacidade física'})
test('entrada operacional abre a prateleira consultada sem herdar capacidade da apresentação',async({page})=>{
  const writes=await prepareKeyboardPage(page)
  await expect(chart(page).getByLabel('Dados do gráfico de capacidade')).toHaveValue('stock')
  await expect(chart(page).getByRole('article',{name:'Consultada A01',exact:true})).toContainText('5 caixas consultadas')
  await expect(chart(page)).toContainText('Capacidade não informada')
  await expect(chart(page).getByRole('meter')).toHaveCount(0)
  await expect(chart(page).getByRole('article',{name:'Prateleira NORTE',exact:true})).toHaveCount(0)
  expect(writes).toEqual([])
})
test('reabrir o Painel recupera a capacidade operacional sem selecionar os exemplos',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('liber:shelf-capacity:v1:stock:11111111-1111-4111-8111-111111111111',JSON.stringify({version:1,userId:'11111111-1111-4111-8111-111111111111',entries:{A01:{boxes:20,basis:'Caixa conferida'}}})))
  await prepareKeyboardPage(page)
  await expect(chart(page)).toContainText('25% da capacidade')
  await page.reload()
  await expect(chart(page).getByLabel('Dados do gráfico de capacidade')).toHaveValue('stock')
  await expect(chart(page)).toContainText('Capacidade: 20 caixas · Caixa conferida')
  await expect(chart(page).getByRole('meter')).toHaveAttribute('aria-valuenow','5')
})
test('página de apresentação conserva as quatro prateleiras sem usar a consulta operacional',async({page})=>{
  await page.goto('/demonstracao.html')
  await expect(chart(page).getByRole('article',{name:'Prateleira NORTE',exact:true})).toContainText('Capacidade: 40 caixas')
  await expect(chart(page).getByRole('article',{name:'Consultada A01',exact:true})).toHaveCount(0)
})
