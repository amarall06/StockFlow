import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'
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
  await page.reload()
  const chart=page.getByRole('region',{name:'Ocupação por capacidade física'})
  await expect(chart).toContainText('Demonstração fictícia')
  await expect(chart.getByRole('button',{name:/Configurar capacidade/})).toHaveCount(0)
  await chart.getByLabel('Dados do gráfico de capacidade').selectOption('stock')
  await expect(chart).toContainText('Capacidade não informada')
})
