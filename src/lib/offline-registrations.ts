import { createSupplier, loadSuppliers } from './receipt-api'
import { loadWarrantyManufacturers, saveWarrantyManufacturer } from './warranty-api'
export type OfflineRegistration = { id: string; userId: string; kind: 'supplier'|'manufacturer'; name: string; phase: 'draft'|'uncertain'|'confirmed'; serverId?: string }
export const registrationKey = (userId: string) => `liber:offline-registrations:v1:${userId}`
export const normalizedRegistrationName = (name: string) => name.trim().replace(/\s+/gu,' ')
export function readOfflineRegistrations(userId: string): OfflineRegistration[] {
  const rows = JSON.parse(localStorage.getItem(registrationKey(userId)) ?? '[]') as OfflineRegistration[]
  if(!Array.isArray(rows)||rows.length>100||rows.some(row=>!row||row.userId!==userId||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id)||!['supplier','manufacturer'].includes(row.kind)||typeof row.name!=='string'||!normalizedRegistrationName(row.name)||row.name.length>100||!['draft','uncertain','confirmed'].includes(row.phase)||(row.phase==='confirmed'&&(typeof row.serverId!=='string'||!row.serverId))))throw new Error('Preserve os cadastros offline para revisão: dados inválidos.')
  if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Há identificadores de cadastro repetidos.')
  return rows
}
export function updateOfflineRegistration(userId: string, id: string, phase: OfflineRegistration['phase']|null, serverId?: string) {
  const rows=readOfflineRegistrations(userId)
  if(phase&&!rows.some(row=>row.id===id))throw new Error('Pedido indisponível nesta conta.')
  const next=phase===null?rows.filter(row=>row.id!==id):rows.map(row=>row.id===id?{...row,phase,serverId}:row)
  const key=registrationKey(userId),value=JSON.stringify(next);localStorage.setItem(key,value)
  if(localStorage.getItem(key)!==value)throw new Error('O aparelho não confirmou a atualização do cadastro. Preserve o pedido.')
  window.dispatchEvent(new Event('liber:offline-operations'))
}
export async function findRegistration(kind: OfflineRegistration['kind'], name: string) {
  const rows=kind==='supplier'?await loadSuppliers():await loadWarrantyManufacturers()
  const normalized=normalizedRegistrationName(name).toLocaleLowerCase('pt-BR')
  return rows.find(row=>normalizedRegistrationName(row.name).toLocaleLowerCase('pt-BR')===normalized)
}
export async function createRegistration(kind: OfflineRegistration['kind'], name: string) {
  return kind==='supplier'?createSupplier(normalizedRegistrationName(name)):saveWarrantyManufacturer(normalizedRegistrationName(name),null)
}
