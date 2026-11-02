import {validateFloorPlan,type FloorPlan} from './floor-plan'
import {parseCapacities,type Capacities} from './shelf-capacity'
export type SharedLayoutDraft={revision:number;layout:FloorPlan;capacities:Capacities}
export type SharedLayout=SharedLayoutDraft&{updatedAt:string;updatedBy:string|null}
export function validateSharedDraft(value:SharedLayoutDraft):SharedLayoutDraft{
  if(!Number.isSafeInteger(value.revision)||value.revision<1||value.revision>2147483647)throw Error('Versão compartilhada inválida.')
  const layout=validateFloorPlan(value.layout)
  for(const rack of Object.values(layout))if(Object.keys(rack).sort().join(',')!=='height,width,x,y')throw Error('Campos da posição inválidos.')
  const capacities=parseCapacities(JSON.stringify({version:1,userId:'shared',entries:value.capacities}),'shared')
  for(const [code,capacity]of Object.entries(capacities))if(!['NORTE','SUL','LESTE','OESTE'].includes(code)||Object.keys(capacity).sort().join(',')!=='basis,boxes')throw Error('Prateleira ou referência inválida.')
  return structuredClone({revision:value.revision,layout,capacities})
}
export function parseSharedLayout(value:unknown):SharedLayout{
  const row=value as {scenario_key:string;revision:number;layout:FloorPlan;capacities:Capacities;updated_at:string;updated_by:string|null}|null
  if(!row||row.scenario_key!=='liber-presentation-v1'||typeof row.updated_at!=='string'||!Number.isFinite(Date.parse(row.updated_at))||(row.updated_by!==null&&(typeof row.updated_by!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(row.updated_by))))throw Error('Resposta da configuração compartilhada inválida.')
  return{...validateSharedDraft(row),updatedAt:row.updated_at,updatedBy:row.updated_by}
}
export function newestSharedLayout(current:SharedLayout|null,incoming:SharedLayout){return current&&current.revision>incoming.revision?current:incoming}
