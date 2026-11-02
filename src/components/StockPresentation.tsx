import { ShelfCapacity } from './ShelfCapacity'
import {useEffect,useState} from 'react'
import {presentationBundle,type PresentationBundle} from '../lib/presentation-bundle'
import {loadPublishedPresentation} from '../lib/presentation-cloud'
import './StockPresentation.css'
import { PickMissions } from './PickMissions'
import { TestingDelay } from './TestingDelay'
import { RecurringDivergences } from './RecurringDivergences'
import { StockAge } from './StockAge'
import { PostalReturns } from './PostalReturns'
import { SharedShelfLayout } from './SharedShelfLayout'
export function StockPresentation({ userId, canEdit, canPick = canEdit }: { userId: string; canEdit: boolean; canPick?: boolean }) {
  const[storedCloud,setCloud]=useState<{data:PresentationBundle;status:'local'|'loading'|'ready'|'error';publishedAt?:string;key:string}>({data:presentationBundle,status:'local',key:''})
  const[reload,setReload]=useState(0)
  const authenticated=userId.startsWith('presentation:')
  const requestKey=authenticated?`${userId}:${reload}`:'local'
  const cloud:typeof storedCloud=storedCloud.key===requestKey?storedCloud:{data:presentationBundle,status:authenticated?'loading':'local',key:requestKey}
  useEffect(()=>{
    if(!authenticated)return
    const controller=new AbortController();let active=true
    const timeout=window.setTimeout(()=>controller.abort(),15000)
    void loadPublishedPresentation(controller.signal).then(result=>{if(active)setCloud({data:result.payload,status:'ready',publishedAt:result.publishedAt,key:requestKey})}).catch(()=>{if(active)setCloud({data:presentationBundle,status:'error',key:requestKey})})
    return()=>{active=false;window.clearTimeout(timeout);controller.abort()}
  },[authenticated,requestKey])
  const data=cloud.data,demoStock=data.stock,demoLocations=data.locations
  const total = demoStock.reduce((sum, row) => sum + row.boxes, 0)
  const awaiting = demoStock.filter(row => row.status === 'Aguardando testagem').reduce((sum, row) => sum + row.boxes, 0)
  return <section className="stock-presentation" aria-label="Apresentação do estoque">
    <section className="inventory-panel dashboard-panel" aria-label="Cenário compartilhado">
      <h2>Cenário da apresentação</h2>
      <p role="status">{cloud.status==='ready'?'Dados-base carregados do Supabase — versão 1.':cloud.status==='loading'?'Consultando cenário compartilhado; exibindo cópia local.':cloud.status==='error'?'Não foi possível carregar o cenário compartilhado. Exibindo cópia local da versão 1.':'Exibindo cópia local da versão 1.'}</p>
      {cloud.publishedAt&&<p>Publicado em {new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(cloud.publishedAt))} (America/Bahia).</p>}
      <p>Prateleiras, saldos e exemplos de referência compartilham a mesma versão. A planta e as capacidades têm configuração compartilhada própria abaixo. Missões e conferências continuam neste navegador. Os exemplos não alteram o estoque operacional.</p>
      {authenticated&&<button className="theme-toggle" type="button" disabled={cloud.status==='loading'} onClick={()=>setReload(value=>value+1)}>Recarregar cenário compartilhado</button>}
    </section>
    <section className="presentation-metrics" aria-label="Indicadores do estoque">
      {[['Caixas em estoque', total], ['Disponíveis para venda', total - awaiting], ['Aguardando testagem', awaiting], ['Prateleiras', demoLocations.length]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </section>
    <section className="inventory-panel dashboard-panel" aria-label="Produtos da apresentação"><h2>Produtos</h2><p>Consulte os códigos no mapa para localizar prateleiras e situações.</p>
      <ul>{[{ code: 'AGM-35', name: 'Amortecedor' }, { code: 'MGM-35', name: 'Mola' }].map(product => {
        const rows = demoStock.filter(row => row.code === product.code)
        return <li key={product.code}><strong>{product.code}</strong> — {product.name}; {rows.reduce((sum, row) => sum + row.boxes, 0)} caixas; locais: {[...new Set(rows.map(row => row.location))].join(', ')}.</li>
      })}</ul>
    </section>
    <TestingDelay key={`testing:${userId}`} userId={userId} canEdit={canEdit} groups={data.testingGroups}/>
    <RecurringDivergences key={`recurrence:${userId}`} userId={userId} canEdit={canEdit} checks={data.divergenceChecks}/>
    <StockAge key={`age:${userId}`} userId={userId} canEdit={canEdit} groups={data.stockAgeGroups} stock={demoStock}/>
    <PostalReturns key={`postal:${userId}`} userId={userId} canOperate={canPick} sources={data.postalReturns}/>
    <PickMissions key={userId} userId={userId} stock={demoStock} canOperate={canPick} orders={data.orders}/>
    {authenticated?<SharedShelfLayout key={`shared:${userId}`} userId={userId} canEdit={canEdit} data={data}/>:<ShelfCapacity userId={userId} locations={demoLocations} stock={demoStock} canEdit={canEdit} demoOnly presentationData={data}/>}
  </section>
}
