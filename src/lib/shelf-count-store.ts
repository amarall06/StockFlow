import { parseShelfCount, type ShelfCount } from './shelf-count'
export const shelfCountKey = (userId: string) => `liber:shelf-count:v1:${userId}`
const event = 'liber:shelf-count'
export function readShelfCountRaw(userId: string) {
  try { return localStorage.getItem(shelfCountKey(userId)) } catch { return '!storage-unavailable' }
}
export function subscribeShelfCount(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener('focus', listener)
  window.addEventListener(event, listener)
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('focus', listener); window.removeEventListener(event, listener) }
}
export function saveShelfCount(userId: string, draft: ShelfCount | null, expectedRaw: string | null) {
  if (readShelfCountRaw(userId) !== expectedRaw) throw new Error('A contagem foi alterada em outra aba. Confira a versão atual antes de editar.')
  if (draft) {
    const raw = JSON.stringify(draft)
    parseShelfCount(raw, userId)
    localStorage.setItem(shelfCountKey(userId), raw)
  } else localStorage.removeItem(shelfCountKey(userId))
  window.dispatchEvent(new Event(event))
}
