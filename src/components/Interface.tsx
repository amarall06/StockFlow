import{useId,type ComponentPropsWithoutRef,type ReactNode}from'react'

export function Card({className='',...props}:ComponentPropsWithoutRef<'section'>){return <section className={`ui-card ${className}`} {...props}/>}
export function Badge({className='',...props}:ComponentPropsWithoutRef<'span'>){return <span className={`ui-badge ${className}`} {...props}/>}
export function Button({className='',variant='secondary',...props}:ComponentPropsWithoutRef<'button'>&{variant?:'primary'|'secondary'|'link'}){return <button type="button" className={`ui-button ui-button-${variant} ${className}`} {...props}/>}
export function Table({children,...props}:ComponentPropsWithoutRef<'table'>){return <div className="ui-table-scroll" tabIndex={0} role="region" aria-label={typeof props['aria-label']==='string'?`Rolagem: ${props['aria-label']}`:'Rolagem da tabela'}><table {...props}>{children}</table></div>}
export function Progress({value,max,label}:{value:number;max:number;label:string}){return <meter className="ui-progress" min={0} max={Math.max(1,max)} value={value} aria-label={label}/>}
export function ActionGroup({label,children}:{label:string;children:ReactNode}){return <div className="ui-action-group" role="group" aria-label={label}>{children}</div>}
export function Tabs({label,items,value,onChange}:{label:string;items:{value:string;label:string;content:ReactNode}[];value:string;onChange:(value:string)=>void}){
 const prefix=useId()
 return <div className="ui-tabs"><div role="tablist" aria-label={label}>{items.map((item,index)=><button type="button" className="ui-button" key={item.value} role="tab" id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel-${index}`} aria-selected={item.value===value} tabIndex={item.value===value?0:-1} onClick={()=>onChange(item.value)} onKeyDown={event=>{
  let next=index
  if(event.key==='ArrowRight')next=(index+1)%items.length;else if(event.key==='ArrowLeft')next=(index-1+items.length)%items.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=items.length-1;else return
  event.preventDefault();onChange(items[next].value);document.getElementById(`${prefix}-tab-${next}`)?.focus()
 }}>{item.label}</button>)}</div>{items.map((item,index)=><div key={item.value} role="tabpanel" tabIndex={0} id={`${prefix}-panel-${index}`} aria-labelledby={`${prefix}-tab-${index}`} hidden={item.value!==value}>{item.content}</div>)}</div>
}
