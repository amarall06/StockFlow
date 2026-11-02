import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
const fixture=JSON.parse(readFileSync(new URL('../fixtures/presentation-scenario.json',import.meta.url),'utf8'))
const panel=page=>page.getByRole('region',{name:'Cenário compartilhado',exact:true})
async function prepare(page,handler?){
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.route('**/rest/v1/presentation_scenarios*',handler??(route=>route.fulfill({json:fixture})))
  await page.getByLabel('Visualização do Painel').selectOption('presentation')
  return writes
}
test('cenário do Supabase alimenta o painel e coleções sem escrita operacional',async({page})=>{
  const reads=[]
  const writes=await prepare(page,route=>{reads.push(route.request().url());return route.fulfill({json:fixture})})
  await expect(panel(page)).toContainText('Dados-base carregados do Supabase — versão 1')
  await expect(page.getByRole('region',{name:'Indicadores do estoque'})).toContainText('85')
  await expect(page.getByRole('region',{name:'Retornos dos Correios',exact:true}).getByLabel('Retorno para conferir').locator('option')).toHaveCount(3)
  await expect(page.getByRole('region',{name:'Permanência das caixas',exact:true})).toContainText('15 sem data')
  expect(reads.length).toBeGreaterThan(0)
  expect(reads.every(url=>new URL(url).searchParams.get('scenario_key')==='eq.liber-presentation-v1')).toBe(true)
  expect(writes).toEqual([])
})
test('versão compartilhada incompatível usa cópia local e permite nova consulta',async({page})=>{
  let valid=false
  await prepare(page,route=>route.fulfill({json:valid?fixture:{...fixture,revision:2}}))
  await expect(panel(page)).toContainText('Não foi possível carregar o cenário compartilhado')
  await expect(page.getByRole('region',{name:'Indicadores do estoque'})).toContainText('85')
  valid=true
  await panel(page).getByRole('button',{name:'Recarregar cenário compartilhado'}).click()
  await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
})
test('falha da API preserva cópia local e reconsulta recupera cenário',async({page})=>{
  let online=false
  await prepare(page,route=>online?route.fulfill({json:fixture}):route.fulfill({status:403,json:{message:'Acesso indisponível'}}))
  await expect(panel(page)).toContainText('Exibindo cópia local da versão 1')
  online=true
  await panel(page).getByRole('button',{name:'Recarregar cenário compartilhado'}).click()
  await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
})
test('carregamento e reconsulta não apagam capacidade e planta locais',async({page})=>{
  const userId='presentation:11111111-1111-4111-8111-111111111111'
  const capacity={version:1,userId,entries:{NORTE:{boxes:55,basis:'Caixa padrão'}}}
  const plan={version:1,userId,layout:{...fixture.payload.floorPlan,NORTE:{...fixture.payload.floorPlan.NORTE,x:20}}}
  await page.addInitScript(({capacity,plan,userId})=>{
    localStorage.setItem(`liber:shelf-capacity:v1:demo:${userId}`,JSON.stringify(capacity))
    localStorage.setItem(`liber:floor-plan:v1:${userId}`,JSON.stringify(plan))
  },{capacity,plan,userId})
  await prepare(page);await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
  await panel(page).getByRole('button',{name:'Recarregar cenário compartilhado'}).click()
  await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
  await page.getByRole('region',{name:'Sincronização da planta e capacidades',exact:true}).getByLabel('Configuração exibida').selectOption('local')
  await expect(page.getByRole('article',{name:'Prateleira NORTE',exact:true})).toContainText('Capacidade: 55 caixas')
  const saved=await page.evaluate(userId=>({capacity:JSON.parse(localStorage.getItem(`liber:shelf-capacity:v1:demo:${userId}`)!),plan:JSON.parse(localStorage.getItem(`liber:floor-plan:v1:${userId}`)!)}),userId)
  expect(saved).toEqual({capacity,plan})
})
test('rota pública anterior continua local e não tenta ler tabela protegida',async({page})=>{
  let reads=0
  await page.route('**/rest/v1/presentation_scenarios*',route=>{reads++;return route.fulfill({status:401,json:{message:'Não autorizado'}})})
  await page.goto('/demonstracao.html')
  await expect(panel(page)).toContainText('Exibindo cópia local da versão 1')
  await expect(panel(page).getByRole('button',{name:'Recarregar cenário compartilhado'})).toHaveCount(0)
  expect(reads).toBe(0)
})
test('Consulta ativa lê cenário compartilhado sem receber gravação de dados-base',async({page})=>{
  const writes=await prepare(page)
  await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,display_name:'Consulta',role:'viewer'}}))
  await page.reload();await page.getByLabel('Visualização do Painel').selectOption('presentation')
  await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
  await expect(page.getByRole('button',{name:'Configurar capacidade de NORTE',exact:true})).toHaveCount(0)
  expect(writes).toEqual([])
})
for(const theme of ['light','dark'])test(`novo controle compartilhado em 375 px com teclado e auditoria A/AA ${theme}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.addInitScript(value=>localStorage.setItem('liber-automotive-theme',value),theme)
  await prepare(page);await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
  const button=panel(page).getByRole('button',{name:'Recarregar cenário compartilhado'})
  await button.focus();await button.press('Enter');await expect(panel(page)).toContainText('Dados-base carregados do Supabase')
  const result=await new AxeBuilder({page}).include('[aria-label="Cenário compartilhado"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
