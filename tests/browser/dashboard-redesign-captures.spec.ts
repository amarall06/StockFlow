import{test,expect}from'@playwright/test'
import{prepareRedesign}from'./helpers/redesign'
test('capturas finais do layout comum em claro, escuro e celular',async({browser})=>{
 for(const theme of ['light','dark'] as const)for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:375,height:812}:{width:1440,height:1000},baseURL:test.info().project.use.baseURL})
  try{
   const page=await context.newPage(),state=await prepareRedesign(page,theme)
   await expect(page.locator('.liber-layout>.main-panel>.topbar')).toHaveCount(1)
   await expect(page.locator('.reference-dashboard')).toBeVisible()
   expect(state.errors).toEqual([])
   await page.screenshot({path:`docs/design/painel-${theme}${mobile?'-mobile':''}.png`,fullPage:true})
  }finally{await context.close()}
 }
})
