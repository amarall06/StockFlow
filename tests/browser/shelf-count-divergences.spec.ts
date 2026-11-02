import {test,expect} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
const userId='11111111-1111-4111-8111-111111111111'
async function prepare(page) {
  const writes=await prepareKeyboardPage(page)
  await openModule(page,'Visão geral');await page.locator('#shelf-count > summary').click()
  await page.getByLabel('Prateleira para contar').selectOption('A01');await page.getByRole('button',{name:'Iniciar contagem local'}).click()
  await page.getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true}).fill('1')
  await page.getByLabel('Caixas contadas MGM-35 Em estoque',{exact:true}).fill('5')
  await openModule(page,'Painel inicial')
  return writes
}
test('Painel separa divergências locais por categoria sem somar ao mapa de movimentações',async({page})=>{
  const writes=await prepare(page)
  const region=page.getByRole('region',{name:'Divergências da contagem local'})
  await expect(region).toContainText('Não representa conferências aprovadas')
  const row=region.getByRole('table').getByRole('row').nth(1)
  await expect(row.getByRole('cell')).toHaveText(['A01','0','2','2','3'])
  await page.getByText('Filtros do painel',{exact:true}).click()
  await page.getByLabel('Filtrar indicadores').selectOption('springs')
  await expect(row.getByRole('cell')).toHaveText(['A01','0','1','0','3'])
  await page.getByLabel('Filtrar indicadores').selectOption('shocks')
  await expect(row.getByRole('cell')).toHaveText(['A01','0','1','2','0'])
  await expect(page.getByRole('table',{name:'Mapa de calor por prateleira',exact:true})).toContainText('Sem evento no período')
  await region.getByRole('button',{name:'Abrir contagem local'}).click()
  await expect(page.getByLabel('Caixas contadas AGM-35 Aguardando testagem',{exact:true})).toHaveValue('1')
  expect(writes).toEqual([])
})
test('dados locais corrompidos ou de outra conta não viram divergência zero no Painel',async({page})=>{
  await prepare(page)
  await page.evaluate(id=>{const key=`liber:shelf-count:v1:${id}`;const draft=JSON.parse(localStorage.getItem(key)!);draft.userId='outra-conta';localStorage.setItem(key,JSON.stringify(draft));window.dispatchEvent(new Event('storage'))},userId)
  await expect(page.getByText('Resumo de divergências locais indisponível.',{exact:false})).toBeVisible()
  await expect(page.getByRole('table',{name:'Resumo de divergências locais por prateleira'})).toHaveCount(0)
  await expect(page.getByRole('status').filter({hasText:'Não foi possível ler a contagem local.'})).toBeVisible()
  const raw=await page.evaluate(id=>localStorage.getItem(`liber:shelf-count:v1:${id}`),userId)
  expect(raw).toContain('outra-conta')
})
