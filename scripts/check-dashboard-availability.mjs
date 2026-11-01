import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const uri=s=>'data:text/javascript;base64,'+Buffer.from(compile(s)).toString('base64')
const category=uri(await readFile('src/lib/product-category.ts','utf8'))
const alerts=uri((await readFile('src/lib/stock-alerts.ts','utf8')).replace("'./product-category'",JSON.stringify(category)))
const {dashboardStockSummary:summary}=await import(uri((await readFile('src/lib/dashboard-summary.ts','utf8')).replace("'./stock-alerts'",JSON.stringify(alerts))))
const catalog={'AGM-35':{minimumBoxes:2},'MGM-35':{minimumBoxes:1}}
const stock=[{code:'AGM-35',status:'Aguardando testagem',boxes:3},{code:'AGM-35',status:'Liberado para venda',boxes:4},{code:'MGM-35',status:'Em estoque',boxes:5}]
assert.deepEqual([summary(catalog,stock,'all').available,summary(catalog,stock,'all').awaiting],[9,3])
assert.deepEqual([summary(catalog,stock,'shocks').available,summary(catalog,stock,'shocks').awaiting],[4,3])
assert.deepEqual([summary(catalog,stock,'springs').available,summary(catalog,stock,'springs').awaiting],[5,0])
assert.equal(summary(catalog,[],'all').available,0)
console.log('4 verificações novas de disponibilidade aprovadas.')
