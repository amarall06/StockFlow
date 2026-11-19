import {useEffect,useRef} from 'react'
import type {StockRow} from '../lib/inventory-api'

export function WarehousePreview({stock,focusLocation}:{stock:StockRow[];focusLocation?:string}){
 const frame=useRef<HTMLIFrameElement>(null)
 useEffect(()=>{
  function send(){frame.current?.contentWindow?.postMessage({type:'liber:warehouse-stock',rows:stock},window.location.origin)}
  function ready(event:MessageEvent){if(event.origin===window.location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==='liber:warehouse-ready')send()}
  window.addEventListener('message',ready);send()
  return()=>window.removeEventListener('message',ready)
 },[stock])
 return <section className="inventory-panel dashboard-panel warehouse-preview-panel" aria-label="Mapa 3D do galpão"><h2>Mapa 3D</h2>{focusLocation&&<p role="status">Local pesquisado: {focusLocation}. Os endereços da nova planta ainda são provisórios.</p>}<iframe ref={frame} title="Mapa 3D ilustrativo do novo galpão" src="/warehouse-preview.html" loading="lazy" style={{width:'100%',height:'min(820px, 85dvh)',border:0,borderRadius:12}}/><a className="theme-toggle" href="/warehouse-preview.html" target="_blank" rel="noreferrer">Abrir mapa em tela inteira</a></section>
}
