import{test,expect,type Page,type Locator}from'@playwright/test'
import AxeBuilder from'@axe-core/playwright'
import{prepareRedesign}from'./helpers/redesign'
async function icons(menu:Locator){
 await menu.locator('summary').click();const buttons=menu.getByRole('button')
 for(const button of await buttons.all()){
  await expect(button.locator('svg.nav-icon')).toHaveCount(1);await expect(button.locator('svg')).toHaveAttribute('aria-hidden','true')
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
 }
}
async function navigate(page:Page,name:'products'|'warranty'){
 const trigger=page.getByRole('button',{name:'Menu',exact:true});if(await trigger.isVisible())await trigger.click()
 await page.locator(`.sidebar:visible [data-page=${name}]`).click()
}
for(const theme of ['light','dark'] as const)test(`Atalhos ${theme}: ícones com texto, nomes acessíveis e navegação no celular`,async({page})=>{
 await page.setViewportSize({width:375,height:812});const state=await prepareRedesign(page,theme)
 const menu=page.locator('.dashboard-quicknav');await icons(menu)
 await expect(menu.getByRole('button',{name:'Produtos',exact:true})).toBeVisible()
 expect((await new AxeBuilder({page}).include('.dashboard-quicknav').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 await page.screenshot({path:`docs/design/atalhos-icones-${theme}-mobile.png`,fullPage:true})
 await menu.getByRole('button',{name:'Produtos',exact:true}).click();await icons(page.locator('.products-shortcuts'))
 await expect(page.getByRole('button',{name:'Estoque de molas',exact:true})).toBeVisible()
 await navigate(page,'warranty');const warranty=page.locator('.warranty-shortcuts');await icons(warranty)
 await warranty.getByRole('button',{name:'Fabricantes, saldos e exportação',exact:true}).click()
 await expect(page.locator('#manufacturers-title')).toBeFocused()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect(state.errors).toEqual([]);expect(state.writes).toEqual([])
})
