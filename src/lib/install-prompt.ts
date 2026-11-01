type InstallPrompt = Event & { prompt: () => Promise<unknown>; userChoice: Promise<{ outcome: string }> }
let pending: InstallPrompt | null = null
const listeners = new Set<() => void>()
const changed = () => listeners.forEach(listener => listener())

// Captura desde a inicialização, mesmo quando a conta ainda está no login.
export function observeInstallPrompt() {
  const available = (event: Event) => { event.preventDefault(); pending = event as InstallPrompt; changed() }
  const installed = () => { pending = null; changed() }
  window.addEventListener('beforeinstallprompt', available)
  window.addEventListener('appinstalled', installed)
  return () => {
    window.removeEventListener('beforeinstallprompt', available)
    window.removeEventListener('appinstalled', installed)
  }
}
export const subscribeInstall = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const canInstall = () => pending !== null
export async function installApp() {
  const event = pending
  if (!event) return
  pending = null
  changed()
  // Um evento só pode abrir a confirmação uma vez; novo convite vem do navegador.
  await event.prompt()
  await event.userChoice
}
