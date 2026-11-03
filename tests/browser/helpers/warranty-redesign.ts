import{expect,type Page}from'@playwright/test'
import{prepareRedesign}from'./redesign'
export const warrantyRows=['received','awaiting_test','warranty','warranty','closed'].map((status,index)=>({id:`aa11000${index}-1111-4111-8111-111111111111`,manufacturer_id:'m1',product_kind:index===3?'spring':'shock',product_code:['AGM-35','AFI-89','AGM-41','MGM-35','AGM-52'][index],description:`Peça recebida ${index+1}`,boxes:index+1,reason:['Vazamento de óleo','Ruído na suspensão','Falha na peça','Mola danificada','Caso encerrado'][index],location:'NORTE',ownership:'ours',status,destination:status==='closed'?'Entregue ao responsável':'',created_at:`2026-11-0${index+1}T12:00:00Z`,updated_at:'2026-11-02T12:00:00Z'}))
export async function openRedesignModule(page:Page,module:'warranty'|'alerts'){
 const menu=page.getByRole('button',{name:'Menu',exact:true})
 if(await menu.isVisible())await menu.click()
 await page.locator(`.sidebar:visible [data-page=${module}]`).click()
 await expect(page.locator(`.reference-${module} h1`)).toBeVisible()
}
export async function prepareWarrantyRedesign(page:Page,theme:'light'|'dark'='light'){
 const state=await prepareRedesign(page,theme)
 await page.route('**/rest/v1/warranty_returns*',route=>route.fulfill({json:warrantyRows}))
 await page.route('**/rest/v1/warranty_manufacturers*',route=>route.fulfill({json:[{id:'m1',name:'Marca cadastrada',updated_at:'2026-11-02T12:00:00Z'}]}))
 await openRedesignModule(page,'warranty')
 await expect(page.locator('.warranty-metrics strong')).toHaveText(['2','2','1'])
 return state
}
