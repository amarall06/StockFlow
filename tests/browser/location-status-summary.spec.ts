import {test,expect} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
test('prateleira distingue amortecedores aguardando e liberados sem presumir peças por caixa',async({page})=>{
  const writes=await prepareKeyboardPage(page,{stock_balances:[{product_id:'p1',location_id:'l1',status_code:'awaiting_test',quantity:3},{product_id:'p1',location_id:'l1',status_code:'released_for_sale',quantity:2},{product_id:'p2',location_id:'l1',status_code:'in_stock',quantity:7}]})
  await openModule(page,'Visão geral')
  const summary=page.getByRole('group',{name:'Resumo da prateleira A01'})
  await expect(summary).toContainText('5 caixas no total')
  await expect(summary).toContainText('Aguardando testagem: 3 caixas')
  await expect(summary).toContainText('Liberado para venda: 2 caixas')
  await expect(summary).toContainText('Duas situações nesta localização')
  await expect(summary).not.toContainText('peças')
  expect(writes).toEqual([])
})
test('molas e prateleira sem saldo mantêm descrição correta sem classificar espaço físico',async({page})=>{
  const writes=await prepareKeyboardPage(page,{locations:[{id:'l1',code:'A01',is_active:true},{id:'l2',code:'A02',is_active:true}]})
  await page.getByLabel('Opções da conta').click();await page.getByRole('button',{name:'Molas',exact:true}).click()
  const summary=page.getByRole('group',{name:'Resumo da prateleira A01'})
  await expect(summary).toContainText('Em estoque: 2 caixas')
  await expect(summary).not.toContainText('testagem')
  await expect(page.getByRole('group',{name:'Resumo da prateleira A02'})).toContainText('0 caixas no total')
  await expect(page.getByText('Saldo zero não comprova espaço disponível.',{exact:false})).toBeVisible()
  expect(writes).toEqual([])
})
