import type { InventorySnapshot } from './inventory-api'
import type { WarrantyManufacturer } from './warranty-api'
import type { WarrantyReturn } from './warranty-returns'
import type { Supplier } from './receipt-api'
const prefix = 'liber:offline-stock:v1:'
export function retainOfflineStockFor(userId: string) {
  try { if (localStorage.getItem(prefix + 'account') !== userId) clearOfflineStock() } catch { clearOfflineStock() }
}
export function clearOfflineStock() {
  try { for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key) } catch { /* Não impede saída da conta. */ }
}
export function saveOfflineStock(userId: string, snapshot: InventorySnapshot, now = Date.now()) {
  if (!navigator.onLine || !userId) return
  try {
    const previous = JSON.parse(localStorage.getItem(prefix + userId) ?? 'null')
    const warranty = previous?.warranty?.expiresAt > now ? previous.warranty : undefined
    const customerReturns = previous?.customerReturns?.expiresAt > now ? previous.customerReturns : undefined
    const suppliers = previous?.suppliers?.expiresAt > now ? previous.suppliers : undefined
    clearOfflineStock()
    localStorage.setItem(prefix + userId, JSON.stringify({ userId, consultedAt: now, expiresAt: now + 15 * 60_000, stock: snapshot.stock, locations: snapshot.locations, warranty, customerReturns, suppliers }))
    localStorage.setItem(prefix + 'account', userId)
  } catch { clearOfflineStock() }
}
export function saveOfflineSuppliers(userId: string, rows: Supplier[]) {
  if (!userId || !navigator.onLine) return
  try {
    const key = prefix + userId, value = JSON.parse(localStorage.getItem(key) ?? 'null'), now = Date.now()
    if (!value || value.userId !== userId || value.expiresAt <= now) return
    value.suppliers = { rows, consultedAt: now, expiresAt: now + 900000 }
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* Não impede o recebimento conectado. */ }
}
export function saveOfflineCustomerReturns(userId: string, rows: WarrantyReturn[]) {
  if (!userId || !navigator.onLine) return
  try {
    const key = prefix + userId, value = JSON.parse(localStorage.getItem(key) ?? 'null'), now = Date.now()
    if (!value || value.userId !== userId || value.expiresAt <= now) return
    value.customerReturns = { rows, consultedAt: now, expiresAt: now + 900000 }
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* Consulta online preservada se o aparelho não puder guardar a cópia. */ }
}
export function saveOfflineWarranty(userId: string, rows: WarrantyManufacturer[]) {
  if (!userId || !navigator.onLine) return
  try {
    const key = prefix + userId, value = JSON.parse(localStorage.getItem(key) ?? 'null'), now = Date.now()
    if (!value || value.userId !== userId || value.expiresAt <= now) return
    value.warranty = { rows, consultedAt: now, expiresAt: now + 900000 }
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* A consulta online não depende do armazenamento local. */ }
}
