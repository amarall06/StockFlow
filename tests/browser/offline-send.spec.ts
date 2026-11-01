import {test,expect} from '@playwright/test'
import {prepareKeyboardPage,openModule} from './helpers/keyboard'
const userId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222'
async function prepare(page){await prepareKeyboardPage(page);await page.evaluate(({userId,id})=>localStorage.setItem(`liber:offline-operations:v1:${userId}`,JSON.stringify([{id,userId,code:'MGM-35',location:'A01',status:'Em estoque',boxes:1,notes:'Rascunho teste',createdAt:Date.now()}])),{userId,id});await openModule(page,'Saídas');page.on('dialog',dialog=>dialog.accept())}
test('rascunho enviado usa UUID original e só é removido depois da confirmação',async({page})=>{
 await prepare(page);const sent=[];await page.route('**/rest/v1/rpc/register_stock_outflow',route=>{sent.push(route.request().postDataJSON());return route.fulfill({json:{id:'confirmed'}})})
 await page.getByRole('button',{name:'Conferir e enviar MGM-35'}).click();await expect(page.getByText('Saída registrada. Estoque e histórico atualizados.',{exact:true})).toBeVisible();expect(sent.length).toBe(1);expect(sent[0].p_request_id).toBe(id);expect(await page.evaluate(userId=>JSON.parse(localStorage.getItem(`liber:offline-operations:v1:${userId}`)).length,userId)).toBe(0)
})
test('resposta perdida conserva pedido e recupera com mesmo UUID após recarregar',async({page})=>{
 await prepare(page);const sent=[];let lost=true;await page.route('**/rest/v1/rpc/register_stock_outflow',route=>{sent.push(route.request().postDataJSON());return lost?route.fulfill({status:400,json:{message:'Resposta desconhecida',code:'network'}}):route.fulfill({json:{id:'confirmed'}})})
 await page.getByRole('button',{name:'Conferir e enviar MGM-35'}).click();await expect(page.getByRole('button',{name:'Conferir pedido pendente'})).toBeVisible();await page.reload();lost=false;await page.getByRole('button',{name:'Conferir pedido pendente'}).click();await expect(page.getByText('Saída registrada. Estoque e histórico atualizados.',{exact:true})).toBeVisible();expect(sent.map(row=>row.p_request_id)).toEqual([id,id])
})
test('conflito de saldo mantém rascunho e não confirma retirada',async({page})=>{
 await prepare(page);await page.route('**/rest/v1/rpc/register_stock_outflow',route=>route.fulfill({status:400,json:{code:'P0001',message:'Saldo insuficiente'}}));await page.getByRole('button',{name:'Conferir e enviar MGM-35'}).click();await expect(page.getByText('O saldo mudou ou é insuficiente. Atualize o estoque antes de tentar novamente.',{exact:true})).toBeVisible();expect(await page.evaluate(userId=>JSON.parse(localStorage.getItem(`liber:offline-operations:v1:${userId}`)).length,userId)).toBe(1)
})

test('confirmação salva sobrevive a falha de atualização sem reenviar retirada',async({page})=>{
 await prepare(page);let sends=0;await page.route('**/rest/v1/rpc/register_stock_outflow',async route=>{sends++;await page.route('**/rest/v1/stock_balances*',read=>read.fulfill({status:400,json:{message:'Atualização indisponível'}}));return route.fulfill({json:{id:'confirmed'}})})
 await page.getByRole('button',{name:'Conferir e enviar MGM-35'}).click();await expect(page.getByRole('button',{name:'Atualizar pedido confirmado'})).toBeVisible();await page.unroute('**/rest/v1/stock_balances*');await page.getByRole('button',{name:'Atualizar pedido confirmado'}).click();await expect(page.getByText('Saída registrada. Estoque e histórico atualizados.',{exact:true})).toBeVisible();expect(sends).toBe(1)
})
test('cancelar conferência não envia nem cria pedido incerto',async({page})=>{
 await prepare(page);page.removeAllListeners('dialog');page.on('dialog',dialog=>dialog.dismiss());let sends=0;await page.route('**/rest/v1/rpc/register_stock_outflow',route=>{sends++;return route.fulfill({json:{id:'unexpected'}})})
 await page.getByRole('button',{name:'Conferir e enviar MGM-35'}).click();expect(sends).toBe(0);await expect(page.getByRole('region',{name:'Pedido de saída pendente'})).toHaveCount(0);expect(await page.evaluate(userId=>JSON.parse(localStorage.getItem(`liber:offline-operations:v1:${userId}`)).length,userId)).toBe(1)
})

test('pendência offline avisa em outra tela e permite abrir a conferência',async({page})=>{
 await prepare(page);await openModule(page,'Painel inicial');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByText('1 rascunhos offline aguardam conferência neste aparelho.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Conferir rascunhos em Saídas'}).click();await expect(page.getByRole('button',{name:'Conferir e enviar MGM-35'})).toBeVisible()
})
