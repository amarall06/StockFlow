import {useEffect,useRef,useState,type RefObject} from 'react'
import {createPortal} from 'react-dom'
import type {StockRow} from '../lib/inventory-api'
import {useModalDialog} from '../lib/use-modal-dialog'
import './WarehousePreview.css'
type Seller={code:string;boxes:number}
function ExpandedMap({frame,onClose}:{frame:RefObject<HTMLIFrameElement|null>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useModalDialog(dialog)
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[])
 return createPortal(<dialog ref={dialog} className="warehouse-fullscreen-dialog" aria-labelledby="warehouse-expanded-title" onCancel={event=>{event.preventDefault();onClose()}}><header><h2 id="warehouse-expanded-title">Mapa 3D ampliado</h2><button type="button" className="theme-toggle" onClick={onClose}>Fechar mapa</button></header><iframe ref={frame} title="Mapa 3D ampliado do galpão" src="/warehouse-preview.html"/></dialog>,document.body)
}
export function WarehousePreview({stock,topSellers=[],focusLocation}:{stock:StockRow[];topSellers?:Seller[];focusLocation?:string}){
 const frame=useRef<HTMLIFrameElement>(null),expandedFrame=useRef<HTMLIFrameElement>(null)
 const [expanded,setExpanded]=useState(false)
 useEffect(()=>{
  function send(target:Window|null|undefined){target?.postMessage({type:'liber:warehouse-stock',rows:stock,topSellers},window.location.origin)}
  function message(event:MessageEvent){
   if(event.origin!==window.location.origin)return
   const small=frame.current?.contentWindow,large=expandedFrame.current?.contentWindow
   if(event.source!==small&&event.source!==large)return
   if(event.data?.type==='liber:warehouse-ready')send(event.source as Window)
   if(expanded&&event.source===large&&event.data?.type==='liber:warehouse-close')setExpanded(false)
  }
  window.addEventListener('message',message);send(frame.current?.contentWindow);send(expandedFrame.current?.contentWindow)
  return()=>window.removeEventListener('message',message)
 },[stock,topSellers,expanded])
 return <section className="inventory-panel dashboard-panel warehouse-preview-panel" aria-label="Mapa 3D do galpão"><h2>Mapa 3D</h2>{focusLocation&&<p role="status">Local pesquisado: {focusLocation}. Os endereços da nova planta ainda são provisórios.</p>}<iframe ref={frame} title="Mapa 3D ilustrativo do novo galpão" src="/warehouse-preview.html" loading="lazy" style={{width:'100%',height:'min(820px, 85dvh)',border:0,borderRadius:12}}/><button type="button" className="theme-toggle warehouse-expand" onClick={()=>setExpanded(true)}>Ampliar mapa</button>{expanded&&<ExpandedMap frame={expandedFrame} onClose={()=>setExpanded(false)}/>}</section>
}
