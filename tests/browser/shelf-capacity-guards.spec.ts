import {test,expect} from '@playwright/test'
import {prepareKeyboardPage as prepareBase} from './helpers/keyboard'
async function prepareKeyboardPage(page){const writes=await prepareBase(page);await page.getByLabel('Dados do gráfico de capacidade').selectOption('demo');return writes}
test('configuração ilegível ou de outra conta não é substituída pelos exemplos',async({page})=>{
  await prepareKeyboardPage(page)
  const chart=page.getByRole('region',{name:'Ocupação por capacidade física'})
  await page.evaluate(()=>{localStorage.setItem('liber:shelf-capacity:v1:demo:11111111-1111-4111-8111-111111111111',JSON.stringify({version:1,userId:'outra-conta',entries:{NORTE:{boxes:10,basis:'Outra'}}}));window.dispatchEvent(new Event('storage'))})
  await expect(chart.getByRole('alert')).toContainText('preservados para revisão')
  await expect(chart.getByRole('meter')).toHaveCount(0)
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('liber:shelf-capacity:v1:demo:11111111-1111-4111-8111-111111111111')!).userId)).toBe('outra-conta')
  await chart.getByLabel('Dados do gráfico de capacidade').selectOption('stock')
  await expect(chart).toContainText('Capacidade não informada')
})
test('perfil Consulta visualiza exemplos mas não recebe controles de edição',async({page})=>{
  await prepareKeyboardPage(page)
  await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,display_name:'Consulta',role:'viewer'}}))
  await page.reload();await page.getByLabel('Dados do gráfico de capacidade').selectOption('demo')
  const chart=page.getByRole('region',{name:'Ocupação por capacidade física'})
  await expect(chart).toContainText('Prateleiras Norte, Sul, Leste e Oeste')
  await expect(chart.getByRole('button',{name:/Configurar capacidade/})).toHaveCount(0)
  await chart.getByLabel('Dados do gráfico de capacidade').selectOption('stock')
  await expect(chart).toContainText('Capacidade não informada')
})
