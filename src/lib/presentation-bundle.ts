import {demoLocations,demoStock,demoCapacities} from './shelf-capacity'
import {initialFloorPlan,floorGrid} from './floor-plan'
import {spaceChecks} from './space-suggestions'
import {fictionalCounts} from './shelf-map'
import {sampleOrders} from './pick-missions'
import {sampleTestingGroups} from './testing-delay'
import {sampleDivergenceChecks} from './recurring-divergences'
import {sampleStockAgeGroups} from './stock-age'
import {samplePostalReturns} from './postal-returns'

export const presentationScenarioKey='liber-presentation-v1'
export const presentationBundle={
  version:1,reference:'2026-11-02',locations:demoLocations,stock:demoStock,capacities:demoCapacities,
  floorPlan:initialFloorPlan,grid:floorGrid,spaceChecks,counts:fictionalCounts,orders:sampleOrders,
  testingGroups:sampleTestingGroups,divergenceChecks:sampleDivergenceChecks,stockAgeGroups:sampleStockAgeGroups,postalReturns:samplePostalReturns,
}
export type PresentationBundle=typeof presentationBundle
function stableValue(value:unknown):unknown{
  if(Array.isArray(value))return value.map(stableValue)
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stableValue(item)]))
  return value
}
export function presentationFingerprint(value:unknown){return JSON.stringify(stableValue(value))}
// A versão 1 é uma referência imutável: novas formas/dados exigem versão explícita.
export function parsePublishedPresentation(value:unknown):{payload:PresentationBundle;publishedAt:string}{
  const row=value as {scenario_key?:unknown;revision?:unknown;payload?:unknown;published_at?:unknown}|null
  if(!row||row.scenario_key!==presentationScenarioKey||row.revision!==1||typeof row.published_at!=='string'||!Number.isFinite(Date.parse(row.published_at))||presentationFingerprint(row.payload)!==presentationFingerprint(presentationBundle))throw Error('O cenário compartilhado não é compatível com esta versão do site.')
  return{payload:structuredClone(row.payload as PresentationBundle),publishedAt:row.published_at}
}
