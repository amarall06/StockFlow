import { useSyncExternalStore } from 'react'
import { readOfflineOperations } from '../lib/offline-operations'
import { readOfflineReceipts } from '../lib/offline-receipts'
import { readOfflineTransfers } from '../lib/offline-transfers'
import { readOfflineWarranty } from '../lib/offline-warranty'
import { readOfflineCustomerReturns } from '../lib/offline-customer-returns'
import { readOfflineTests } from '../lib/offline-tests'
const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener)
  window.addEventListener('focus', listener)
  window.addEventListener('liber:offline-operations', listener)
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('focus', listener); window.removeEventListener('liber:offline-operations', listener) }
}
export function OfflineTestPendingNotice({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const count = useSyncExternalStore(subscribe, () => { try { return readOfflineTests(userId).length } catch { return -1 } }, () => 0)
  if (!count) return null
  return <p role="status">{count < 0 ? 'Há aprovações de testagem offline que precisam de revisão.' : `${count} aprovações de testagem offline aguardam conferência neste aparelho.`} <button type="button" className="theme-toggle" onClick={onOpen}>Conferir testagens offline</button></p>
}
export function OfflineCustomerReturnPendingNotice({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const count = useSyncExternalStore(subscribe, () => { try { return readOfflineCustomerReturns(userId).length } catch { return -1 } }, () => 0)
  const confirmed = useSyncExternalStore(subscribe, () => { try { return readOfflineCustomerReturns(userId).filter(row => row.phase === 'confirmed').length } catch { return 0 } }, () => 0)
  if (!count) return null
  return <p role="status">{count < 0 ? 'Há devoluções offline que precisam de revisão.' : `${count} devoluções offline aguardam conferência neste aparelho.`} {confirmed > 0 && <span>{confirmed} já confirmadas aguardam apenas atualização da lista; não registre novamente.</span>} <button type="button" className="theme-toggle" onClick={onOpen}>Conferir devoluções offline</button></p>
}
export function OfflineWarrantyPendingNotice({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const count = useSyncExternalStore(subscribe, () => { try { return readOfflineWarranty(userId).length } catch { return -1 } }, () => 0)
  if (!count) return null
  return <p role="status">{count < 0 ? 'Há pedidos de garantia offline que precisam de revisão.' : `${count} pedidos de garantia offline aguardam conferência neste aparelho.`} <button type="button" className="theme-toggle" onClick={onOpen}>Conferir garantia offline</button></p>
}
export function OfflineTransferPendingNotice({ userId, onOpen }: { userId: string; onOpen: () => void }) {
  const count = useSyncExternalStore(subscribe, () => { try { return readOfflineTransfers(userId).length } catch { return -1 } }, () => 0)
  if (!count) return null
  return <p role="status">{count < 0 ? 'Há transferências offline que precisam de revisão.' : `${count} transferências offline aguardam conferência neste aparelho.`} <button type="button" className="theme-toggle" onClick={onOpen}>Conferir transferências offline</button></p>
}
export function OfflinePendingNotice({ userId, onOpen, onReceipts, canOutflow = true }: { userId: string; onOpen: () => void; onReceipts: () => void; canOutflow?: boolean }) {
  const count = useSyncExternalStore(subscribe, () => { try { return canOutflow ? readOfflineOperations(userId).length : 0 } catch { return -1 } }, () => 0)
  const receipts = useSyncExternalStore(subscribe, () => { try { return readOfflineReceipts(userId).length } catch { return -1 } }, () => 0)
  if (!count && !receipts) return null
  return <div>{Boolean(count) && <p role="status">{count < 0 ? 'Há rascunhos offline que precisam de revisão neste aparelho.' : `${count} rascunhos offline aguardam conferência neste aparelho.`} <button type="button" className="theme-toggle" onClick={onOpen}>Conferir rascunhos em Saídas</button></p>}{Boolean(receipts) && <p role="status">{receipts < 0 ? 'Há entradas offline que precisam de revisão.' : `${receipts} entradas offline aguardam conferência neste aparelho.`} <button type="button" className="theme-toggle" onClick={onReceipts}>Conferir entradas offline</button></p>}</div>
}
