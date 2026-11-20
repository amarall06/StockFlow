import {useEffect,useRef,useState,type RefObject} from 'react'
import {createPortal} from 'react-dom'
import type {StockRow} from '../lib/inventory-api'
import {useModalDialog} from '../lib/use-modal-dialog'
import './WarehousePreview.css'
import type {WarehouseActionHandler} from '../lib/warehouse-navigation'
function isMapLocation(value:string){const match=/^T(\d{2})(?:-([A-D])-([1-4]))?$/.exec(value.toUpperCase());if(!match)return false;const face=Number(match[1]);return face>=3&&face<=16&&!(face<=8&&match[2]==='D')}
type Seller={code:string;boxes:number}
function ExpandedMap({frame,onClose}:{frame:RefObject<HTMLIFrameElement|null>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useModalDialog(dialog)
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[])
 return createPortal(<dialog ref={dialog} className="warehouse-fullscreen-dialog" aria-labelledby="warehouse-expanded-title" onCancel={event=>{event.preventDefault();onClose()}}><header><h2 id="warehouse-expanded-title">Mapa 3D ampliado</h2><button type="button" className="theme-toggle" onClick={onClose}>Fechar mapa</button></header><iframe ref={frame} title="Mapa 3D ampliado do galpão" src="/warehouse-preview.html"/></dialog>,document.body)
}
export function WarehousePreview({stock,topSellers=[],focusLocation,canOutflow=false,onAction}:{stock:StockRow[];topSellers?:Seller[];focusLocation?:string;canOutflow?:boolean;onAction?:WarehouseActionHandler}){
 const frame=useRef<HTMLIFrameElement>(null),expandedFrame=useRef<HTMLIFrameElement>(null)
 const [expanded,setExpanded]=useState(false)
 const unmapped=stock.filter(row=>row.boxes>0&&/^A[A-Z]{2}-/.test(row.code)&&!isMapLocation(row.location))
 useEffect(()=>{
  function send(target:Window|null|undefined){target?.postMessage({type:'liber:warehouse-stock',rows:stock,topSellers,demoMode:false,canOutflow,canNavigate:Boolean(onAction)},window.location.origin)}
  function message(event:MessageEvent){
   if(event.origin!==window.location.origin)return
   const small=frame.current?.contentWindow,large=expandedFrame.current?.contentWindow
   if(event.source!==small&&event.source!==large)return
   if(event.data?.type==='liber:warehouse-ready')send(event.source as Window)
   const requested=event.data?.row
   if(event.data?.type==='liber:warehouse-action'&&requested){const row=stock.find(r=>r.code===requested.code&&r.location===requested.location&&r.status===requested.status&&r.boxes>0);const action=event.data.action;if(row&&['inventory','outflow','history'].includes(action)&&(action!=='outflow'||canOutflow))onAction?.(action,row)}
   if(expanded&&event.source===large&&event.data?.type==='liber:warehouse-close')setExpanded(false)
  }
  window.addEventListener('message',message);send(frame.current?.contentWindow);send(expandedFrame.current?.contentWindow)
  return()=>window.removeEventListener('message',message)
 },[stock,topSellers,expanded,canOutflow,onAction])
 return <section className="inventory-panel dashboard-panel warehouse-preview-panel" aria-label="Mapa 3D do galpão"><header className="warehouse-panel-heading"><h2>Mapa 3D</h2><div className="warehouse-heading-tools"><button type="button" className="theme-toggle warehouse-expand" aria-label="Ampliar mapa" title="Ampliar mapa" onClick={()=>setExpanded(true)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6"/></svg></button></div></header>{unmapped.length>0&&<p role="status">{unmapped.reduce((sum,row)=>sum+row.boxes,0)} caixas de amortecedores estão em endereços fora desta planta. Consulte Produtos para conferir seus locais; nenhum saldo foi movido.</p>}{focusLocation&&<p role="status">Local pesquisado: {focusLocation}. Os endereços da nova planta ainda são provisórios.</p>}<iframe ref={frame} title="Mapa 3D ilustrativo do novo galpão" src="/warehouse-preview.html" loading="lazy" style={{width:'100%',height:'min(820px, 85dvh)',border:0,borderRadius:12}}/>{expanded&&<ExpandedMap frame={expandedFrame} onClose={()=>setExpanded(false)}/>}</section>
}
