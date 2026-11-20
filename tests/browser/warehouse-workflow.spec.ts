import {test,expect} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'
import AxeBuilder from '@axe-core/playwright'
const map=scope=>scope.getByRole('group',{name:'Mapa interativo com sete prateleiras',exact:true})
const frameOf=page=>page.frameLocator('iframe[title="Mapa 3D ilustrativo do novo galpão"]')
const data={locations:[{id:'l1',code:'T03-A-1',is_active:true},{id:'l2',code:'T04-C-2',is_active:true}],stock_balances:[{product_id:'p1',location_id:'l1',status_code:'awaiting_test',quantity:3},{product_id:'p1',location_id:'l2',status_code:'released_for_sale',quantity:4},{product_id:'p2',location_id:'l1',status_code:'in_stock',quantity:2}]}
async function prepare(page,viewer=false){await page.setViewportSize({width:1440,height:1000});const writes=await prepareKeyboardPage(page,data,viewer?async()=>{await page.route('**/rest/v1/profiles*',route=>route.fulfill({json:{is_active:true,display_name:'Pessoa Consulta',role:'viewer'}}))}:undefined);const notice=page.getByRole('button',{name:'Fechar aviso de estoque'});if(await notice.isVisible())await notice.click();return writes}
async function openRack(scope){await map(scope).focus();await map(scope).press('Enter');await expect(scope.getByRole('heading',{name:'Bloco 1',exact:true})).toBeVisible()}
test('busca removida, bloco lista só seus amortecedores e Selecionar abre estoque filtrado',async({page})=>{
 const writes=await prepare(page),frame=frameOf(page);await expect(frame.getByRole('searchbox')).toHaveCount(0);await openRack(frame);await expect(frame.locator('#product-rows')).toContainText('T03-A-1');await expect(frame.locator('#product-rows')).toContainText('T04-C-2');await expect(frame.locator('#product-rows')).not.toContainText('MGM-35');await frame.getByRole('button',{name:'Selecionar AGM-35 em T04-C-2',exact:true}).click();await expect(page.locator('.app-shell > .sidebar [data-page="inventory"][aria-current="page"]')).toBeVisible();await expect(page.locator('.map-inventory-context')).toContainText('T04-C-2');await expect(page.locator('#regional-stock-table tbody tr')).toHaveCount(1);await expect(page.locator('#regional-stock-table')).toContainText('4');expect(writes).toEqual([])
})
test('Retirar começa na tela de saídas com código, local e saldo escolhidos, sem baixar caixas',async({page})=>{
 const writes=await prepare(page),frame=frameOf(page);await openRack(frame);await frame.getByRole('button',{name:'Retirar AGM-35 em T04-C-2',exact:true}).click();await expect(page.getByRole('heading',{name:'Saídas de estoque',exact:true})).toBeVisible();await expect(page.getByRole('combobox',{name:'Saldo de origem',exact:true})).toHaveValue(JSON.stringify(['AGM-35','T04-C-2','Liberado para venda']));await expect(page.getByRole('button',{name:'Registrar saída',exact:true})).toBeEnabled();expect(writes).toEqual([])
})
test('mapa cadastrado não mistura exemplos e não inventa locais',async({page})=>{
 const writes=await prepare(page),frame=frameOf(page);await openRack(frame);await expect(frame.locator('#product-rows')).toContainText('3 caixas');await expect(frame.locator('#product-rows')).not.toContainText('6 caixas');await expect(frame.getByText('Dados fictícios',{exact:true})).not.toBeVisible();await expect(frame.getByRole('button',{name:/Simular retirada/})).toHaveCount(0);expect(writes).toEqual([])
})

test('Consulta não pode iniciar retirada nem por mensagem fabricada',async({page})=>{
 const writes=await prepare(page,true),frame=frameOf(page);await openRack(frame);await expect(frame.getByRole('button',{name:/^Retirar /})).toHaveCount(0);await map(frame).evaluate(()=>window.parent.postMessage({type:'liber:warehouse-action',action:'outflow',row:{code:'AGM-35',location:'T04-C-2',status:'Liberado para venda'}},location.origin));await expect(page.getByRole('heading',{name:'Painel inicial',exact:true})).toBeVisible();expect(writes).toEqual([])
})
test('mapa offline abre sem exemplos nem operações de estoque',async({page,context})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/warehouse-preview.html');await page.evaluate(async()=>{await navigator.serviceWorker.ready});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.reload();await openRack(page);await expect(page.locator('#product-rows')).toContainText('Abra o mapa pelo Painel conectado');await expect(page.locator('#product-rows')).not.toContainText('AGM-35');await expect(page.getByRole('button',{name:/Retirar|Simular retirada/})).toHaveCount(0);const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations.map(v=>v.id)).toEqual([])
})
