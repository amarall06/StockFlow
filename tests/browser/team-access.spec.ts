import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {prepareKeyboardPage} from './helpers/keyboard'
const own='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222'
const team=page=>page.getByRole('region',{name:'Gestão da equipe',exact:true})
function database(){return {rows:[{id:own,display_name:'Administrador',role:'administrator',is_active:true,access_revision:1},{id:target,display_name:'Funcionário',role:'viewer',is_active:false,access_revision:1}],calls:[] as any[],receipts:new Map(),commits:0,lose:false,denied:false}}
async function prepare(page,db){
  const writes=await prepareKeyboardPage(page)
  const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.route('**/rest/v1/profiles*',route=>{
    const url=new URL(route.request().url())
    if(url.searchParams.has('id'))return route.fulfill({json:db.rows[0]})
    if(db.denied)return route.fulfill({status:403,json:{message:'Acesso negado'}})
    return route.fulfill({json:Number(url.searchParams.get('offset'))>0?[]:db.rows})
  })
  await page.route('**/rest/v1/rpc/save_team_access',route=>{
    const input=route.request().postDataJSON();db.calls.push(input)
    if(db.receipts.has(input.p_request_id))return route.fulfill({json:db.receipts.get(input.p_request_id)})
    const row=db.rows.find(row=>row.id===input.p_target_id)
    if(db.denied)return route.fulfill({status:403,json:{code:'42501'}})
    if(!row||row.access_revision!==input.p_expected_revision)return route.fulfill({status:409,json:{code:'40001'}})
    Object.assign(row,{display_name:input.p_display_name,role:input.p_role,is_active:input.p_active,access_revision:row.access_revision+1});db.commits++
    db.receipts.set(input.p_request_id,structuredClone(row))
    if(db.lose){db.lose=false;return route.fulfill({status:500,json:{code:'08006'}})}
    return route.fulfill({json:row})
  })
  await page.getByRole('button',{name:'Abrir meu perfil'}).click()
  await expect(team(page)).toContainText('2 contas')
  return writes
}
async function edit(page){await team(page).getByRole('button',{name:'Editar acesso de Funcionário',exact:true}).click();return team(page).getByRole('form',{name:'Editar acesso da equipe'})}
async function confirm(form){await form.getByLabel('Conferi a identidade',{exact:false}).check();await form.getByRole('button',{name:'Confirmar alteração de acesso',exact:true}).click()}
test('administrador identifica contas e atribui Testador com confirmação e histórico no servidor',async({page})=>{
  const db=database(),writes=await prepare(page,db)
  await expect(team(page).getByRole('button',{name:'Editar acesso de Administrador',exact:true})).toHaveCount(0)
  const form=await edit(page)
  await expect(form.getByRole('button',{name:'Confirmar alteração de acesso',exact:true})).toBeDisabled()
  await form.getByLabel('Nome do funcionário').fill('Ana Testagem')
  await form.getByLabel('Função do funcionário').selectOption('tester');await form.getByLabel('Acesso ativo',{exact:true}).check()
  await confirm(form)
  await expect(team(page)).toContainText('1 testadores ativos')
  await expect(team(page)).toContainText('Ana Testagem');expect(db.commits).toBe(1);expect(writes).toEqual([])
  await team(page).getByLabel('Filtrar equipe por função').selectOption('tester')
  await expect(team(page).getByRole('listitem')).toHaveCount(1)
})
test('confirmação perdida conserva a identidade da tentativa e não repete alteração de acesso',async({page})=>{
  const db=database();db.lose=true;await prepare(page,db)
  const form=await edit(page);await form.getByLabel('Acesso ativo',{exact:true}).check();await confirm(form)
  await expect(form.getByRole('alert')).toContainText('Não foi possível confirmar')
  await form.getByRole('button',{name:'Confirmar alteração de acesso',exact:true}).click()
  await expect(team(page)).toContainText('Alteração de acesso confirmada')
  expect(db.calls).toHaveLength(2);expect(db.calls[0].p_request_id).toBe(db.calls[1].p_request_id);expect(db.commits).toBe(1)
})
test('edição concorrente não sobrescreve acesso mais recente nem perde o preenchimento',async({page})=>{
  const db=database();await prepare(page,db);const form=await edit(page)
  await form.getByLabel('Nome do funcionário').fill('Nome em revisão');db.rows[1].access_revision++
  await confirm(form);await expect(form.getByRole('alert')).toContainText('mudou em outra janela')
  await expect(form.getByLabel('Nome do funcionário')).toHaveValue('Nome em revisão');expect(db.commits).toBe(0)
})
test('permissão revogada bloqueia envio e atualização remove a lista protegida anterior',async({page})=>{
  const db=database();await prepare(page,db);const form=await edit(page);db.denied=true
  await confirm(form);await expect(form.getByRole('alert')).toContainText('Seu acesso não permite')
  await form.getByRole('button',{name:'Fechar edição de acesso'}).click();await team(page).getByRole('button',{name:'Atualizar equipe',exact:true}).click()
  await expect(team(page).getByRole('alert')).toContainText('Não foi possível consultar')
  await expect(team(page).getByRole('listitem')).toHaveCount(0);expect(db.commits).toBe(0)
})
test('Consulta não recebe gestão da equipe nem consulta a lista de contas',async({page})=>{
  await prepareKeyboardPage(page);let lists=0
  await page.route('**/rest/v1/profiles*',route=>{if(!new URL(route.request().url()).searchParams.has('id'))lists++;return route.fulfill({json:{role:'viewer',is_active:true,display_name:'Consulta'}})})
  await page.reload();const close=page.getByRole('button',{name:'Fechar aviso de estoque',exact:true});if(await close.isVisible())await close.click()
  await page.getByRole('button',{name:'Abrir meu perfil'}).click();await expect(page.getByRole('heading',{name:'Meu perfil',exact:true})).toBeVisible()
  await expect(team(page)).toHaveCount(0);expect(lists).toBe(0)
})
for(const dark of [false,true])test(`gestão da equipe em 375px com campos acessíveis no tema ${dark?'escuro':'claro'}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await prepare(page,database())
  if(dark)await page.evaluate(()=>document.querySelector('.app-shell')?.classList.add('theme-dark'))
  const form=await edit(page)
  await form.getByLabel('Nome do funcionário').focus();await page.keyboard.press('Tab');await expect(form.getByLabel('Função do funcionário')).toBeFocused()
  expect(await team(page).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
  const result=await new AxeBuilder({page}).include('.team-access').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations).toEqual([])
})
test('conta incompleta em nova consulta bloqueia edição e confirmação é refeita se a função mudar',async({page})=>{
  const db=database();await prepare(page,db)
  const form=await edit(page);await form.getByLabel('Conferi a identidade',{exact:false}).check()
  await form.getByLabel('Função do funcionário').selectOption('tester')
  await expect(form.getByLabel('Conferi a identidade',{exact:false})).not.toBeChecked()
  await expect(form.getByRole('button',{name:'Confirmar alteração de acesso',exact:true})).toBeDisabled()
  await form.getByRole('button',{name:'Fechar edição de acesso'}).click()
  delete (db.rows[1] as any).access_revision
  await team(page).getByRole('button',{name:'Atualizar equipe',exact:true}).click()
  await expect(team(page).getByRole('alert')).toContainText('conta incompleta')
  await expect(team(page).getByRole('listitem')).toHaveCount(0)
})
