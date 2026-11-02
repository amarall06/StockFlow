import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
const userId='11111111-1111-4111-8111-111111111111'
async function start(page) {
  const writes=await prepareKeyboardPage(page)
  await openModule(page,'Visão geral')
  await page.locator('#shelf-count > summary').click()
  await page.getByLabel('Prateleira para contar').selectOption('A01')
  await page.getByRole('button',{name:'Iniciar contagem local'}).click()
  return writes
}
const shock=(page)=>page.getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true})
const spring=(page)=>page.getByLabel('Caixas contadas MGM-35 Em estoque',{exact:true})

test('contagem recupera branco e zero após reabrir sem ajustar saldo e mostra aviso em outra tela',async({page})=>{
  const writes=await start(page)
  await expect(page.getByRole('button',{name:'Exportar contagem para revisão'})).toBeDisabled()
  await shock(page).fill('0')
  await expect(page.locator('#shelf-count')).toContainText('1 itens por contar')
  await page.reload();await openModule(page,'Visão geral');await page.locator('#shelf-count > summary').click()
  await expect(shock(page)).toHaveValue('0');await expect(spring(page)).toHaveValue('')
  await expect(page.getByRole('table',{name:'Contagem física por produto e situação'})).toContainText('Não contado')
  await openModule(page,'Produtos')
  await expect(page.getByRole('status').filter({hasText:'Contagem local de A01:'})).toContainText('Não enviada para aprovação')
  await page.getByRole('button',{name:'Conferir contagem de prateleira'}).click()
  await expect(shock(page)).toHaveValue('0')
  expect(writes).toEqual([])
})

test('CSV real separa falta e sobra, mantém referência e identifica rascunho não aprovado',async({page})=>{
  const writes=await start(page)
  await shock(page).fill('1');await spring(page).fill('5')
  await page.getByLabel('Observação da contagem').fill('=observação; "revisar"')
  await expect(page.locator('#shelf-count')).toContainText('faltam 2 caixas e sobram 3 caixas')
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:'Exportar contagem para revisão'}).click()
  const download=await downloadPromise
  const bytes=await readFile((await download.path())!)
  expect(bytes.subarray(0,3)).toEqual(Buffer.from([239,187,191]))
  const csv=bytes.toString('utf8')
  expect(csv).toContain('Rascunho local — não aprovado');expect(csv).toContain('"AGM-35";"Aguardando testagem";3;1;-2;')
  expect(csv).toContain('"MGM-35";"Em estoque";2;5;3;')
  expect(csv).toContain('"\'=observação; ""revisar"""')
  expect(download.suggestedFilename()).toMatch(/^conferencia-prateleira-rascunho-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(writes).toEqual([])
})

test('mudança de saldo sinaliza recontagem sem substituir contagem ou referência',async({page})=>{
  await start(page);await shock(page).fill('3');await spring(page).fill('2')
  await page.route('**/rest/v1/stock_balances*',route=>route.fulfill({json:Number(new URL(route.request().url()).searchParams.get('offset'))>0?[]:[{product_id:'p1',location_id:'l1',status_code:'awaiting_test',quantity:9},{product_id:'p2',location_id:'l1',status_code:'in_stock',quantity:2}]}))
  await page.getByRole('button',{name:'Atualizar saldo para comparação'}).click()
  await expect(page.locator('#shelf-count').getByRole('alert')).toContainText('mudou desde o início')
  await expect(shock(page)).toHaveValue('3')
  const raw=await page.evaluate(id=>JSON.parse(localStorage.getItem(`liber:shelf-count:v1:${id}`)!),userId)
  expect(raw.rows.find(row=>row.code==='AGM-35').expected).toBe(3)
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar contagem para revisão'}).click()
  expect(await readFile((await(await pending).path())!,'utf8')).toContain('Sim — recontagem necessária')
})

test('acrescenta produto sem saldo na situação compatível e exige confirmação para descartar',async({page})=>{
  const writes=await start(page)
  await page.getByLabel('Produto encontrado sem saldo').selectOption('AGM-35')
  await page.getByLabel('Situação encontrada').selectOption('Liberado para venda')
  await page.getByRole('button',{name:'Acrescentar à contagem'}).click()
  await page.getByLabel('Caixas contadas AGM-35 Liberado para venda',{exact:true}).fill('4')
  await expect(page.locator('#shelf-count')).toContainText('sobram 4 caixas')
  await page.getByLabel('Produto encontrado sem saldo').selectOption('MGM-35')
  await expect(page.getByLabel('Situação encontrada').locator('option')).toHaveText(['Em estoque'])
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Descartar contagem local'}).click()
  await expect(page.getByRole('heading',{name:'Contagem de A01',exact:true})).toBeVisible()
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Descartar contagem local'}).click()
  await expect(page.getByRole('button',{name:'Iniciar contagem local'})).toBeVisible()
  expect(await page.evaluate(id=>localStorage.getItem(`liber:shelf-count:v1:${id}`),userId)).toBeNull()
  expect(writes).toEqual([])
})

test('contagem funciona por teclado em celular e perfil Consulta não recebe edição local',async({page})=>{
  await page.setViewportSize({width:375,height:812})
  await prepareKeyboardPage(page)
  await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.getByRole('dialog',{name:'Menu de navegação'}).getByRole('button',{name:'Visão geral',exact:true}).click()
  const summary=page.locator('#shelf-count > summary');await summary.focus();await page.keyboard.press('Enter')
  await page.getByLabel('Prateleira para contar').selectOption('A01')
  await page.getByRole('button',{name:'Iniciar contagem local'}).focus();await page.keyboard.press('Enter')
  await shock(page).focus();await page.keyboard.type('2');await page.keyboard.press('Tab');await expect(spring(page)).toBeFocused()
  const scroll=page.getByRole('region',{name:'Rolagem da contagem'});await scroll.focus();await expect(scroll).toBeFocused()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,display_name:'Consulta',role:'viewer'}}))
  await page.reload();await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.getByRole('dialog',{name:'Menu de navegação'}).getByRole('button',{name:'Visão geral',exact:true}).click()
  await expect(page.locator('#shelf-count')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Conferir contagem de prateleira'})).toHaveCount(0)
})
