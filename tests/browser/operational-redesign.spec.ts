import {expect, test} from '@playwright/test'
import {prepareKeyboardPage} from './helpers/keyboard'

for (const {width, theme} of [{width:360, theme:'dark'}, {width:1920, theme:'light'}] as const) {
  test(`telas operacionais em ${width}px no tema ${theme}`, async ({page}) => {
    await page.setViewportSize({width, height:900})
    await page.emulateMedia({colorScheme:theme})
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.routeWebSocket('wss://stockflow-test.supabase.co/**', socket => socket.close())
    const writes = await prepareKeyboardPage(page, {
      stock_movements:[{id:'move-1',created_at:'2026-11-02T12:00:00Z',movement_type:'sale',quantity:1,unit_type:'box',
        product:{code:'MGM-35'},origin:{code:'A01'},destination:null,performed_by:null}],
    })
    const notice = page.getByRole('button', {name:'Fechar aviso de estoque', exact:true})
    if (await notice.isVisible()) await notice.click()
    const navigate = async (name: string, title: string) => {
      const menu = page.getByRole('button', {name:'Menu',exact:true})
      if (await menu.isVisible()) await menu.click()
      await page.getByRole('navigation', {name:'Menu principal'}).getByRole('button', {name,exact:true}).click()
      const heading = page.getByRole('heading', {name:title,exact:true})
      await expect(heading).toHaveCSS('font-size',width===360?'30px':'40px')
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
    const surface = theme==='dark'?'rgb(43, 26, 17)':'rgb(255, 255, 255)'
    await navigate('Saídas','Saídas de estoque')
    await expect(page.getByRole('region',{name:'Registrar saída de caixas'})).toHaveCSS('background-color',surface)
    await expect(page.getByRole('combobox',{name:'Categoria',exact:true})).toHaveCSS('min-height','44px')

    await navigate('Histórico','Histórico de movimentações')
    const history = page.getByRole('region',{name:'Rolagem da tabela de movimentações'})
    await expect(history).toContainText('MGM-35')
    await history.focus()
    await expect(history).toBeFocused()
    if(width===360)expect(await history.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true)
    await page.getByRole('button',{name:'Atualizar',exact:true}).click()
    await expect(history).toContainText('1 caixa')

    await navigate('Aplicações','Cadastro de aplicações')
    await expect(page.getByRole('region',{name:'Aplicações de amortecedores'})).toHaveCSS('background-color',surface)
    await expect(page.getByRole('combobox',{name:'Amortecedor',exact:true})).toHaveValue('AGM-35')

    await navigate('Visão geral','Visão geral')
    const stock = page.getByRole('region',{name:'Rolagem da tabela de estoque'})
    await expect(stock).toContainText('AGM-35')
    await page.getByRole('searchbox',{name:'Buscar por código, aplicação ou localização'}).fill('ZZZ-99')
    await expect(stock).toContainText('Nenhum registro encontrado')
    expect(errors).toEqual([])
    expect(writes).toEqual([])
  })
}
