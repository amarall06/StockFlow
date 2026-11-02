import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'

test('última conhecida anterior ao período não altera contagem nem calor da janela',async({page})=>{
  const writes=await prepareKeyboardPage(page)
  const requests:URL[]=[]
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*',async route=>{
    const url=new URL(route.request().url());requests.push(url)
    if(url.searchParams.get('product.code')==='eq.AGM-35') return route.fulfill({json:[{created_at:'2024-01-02T15:00:00Z',product:{code:'AGM-35'}}]})
    return route.fulfill({json:[]})
  })
  const panel=page.getByRole('region',{name:'Atividade por produto e prateleira'})
  await panel.getByLabel('Período de atividade').selectOption('30')
  const table=panel.getByRole('table',{name:'Última movimentação dos produtos com saldo'})
  await expect(table.getByRole('row').filter({hasText:'AGM-35'})).toContainText('02/01/2024')
  await expect(table.getByRole('row').filter({hasText:'MGM-35'})).toContainText('Sem histórico disponível')
  await expect(panel).toContainText('Produtos com saldo sem movimentação no período: 2')
  await expect(panel.getByRole('table',{name:'Mapa de calor por prateleira',exact:true})).toContainText('0%')
  const historical=requests.filter(url=>url.searchParams.has('product.code'))
  expect([...new Set(historical.map(url=>url.searchParams.get('product.code')))].sort()).toEqual(['eq.AGM-35','eq.MGM-35'])
  for(const url of historical){expect(url.searchParams.get('limit')).toBe('1');expect(url.searchParams.get('order')).toBe('created_at.desc,id.desc');expect(url.searchParams.get('created_at')).toMatch(/^lt\./);expect(url.searchParams.get('unit_type')).toBe('eq.box')}
  expect(writes).toEqual([])
})

test('falha na leitura antiga não vira ausência de histórico',async({page})=>{
  await prepareKeyboardPage(page)
  await page.route('https://stockflow-test.supabase.co/rest/v1/stock_movements*',route=>route.fulfill(new URL(route.request().url()).searchParams.has('product.code')?{status:403,json:{message:'recusado'}}:{json:[]}))
  const panel=page.getByRole('region',{name:'Atividade por produto e prateleira'})
  await panel.getByLabel('Período de atividade').selectOption('180')
  await expect(panel).toContainText('Não foi possível atualizar')
  await expect(panel.getByRole('table')).toHaveCount(0)
  await expect(panel).not.toContainText('Sem histórico disponível')
})
