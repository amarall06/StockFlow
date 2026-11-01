import type { SupabaseClient } from '@supabase/supabase-js'

type Client = Pick<SupabaseClient, 'channel' | 'removeChannel'>
const pendingCleanup = new WeakMap<Client, Promise<void>>()

// O canal privado só invalida consultas: nunca aplica dados recebidos no saldo.
export function startInventoryRealtime(client: Client, changed: () => void) {
  let active = true
  let channel: ReturnType<Client['channel']> | undefined
  // Aguarda a remoção anterior para não reutilizar canal encerrando (StrictMode/conta).
  const opening = (pendingCleanup.get(client) ?? Promise.resolve()).then(() => {
    if (!active) return
    channel = client.channel('inventory:changes', { config: { private: true } })
    channel.on('broadcast', { event: 'inventory_changed' }, () => {
      if (active) changed()
    }).subscribe(status => {
      // Uma nova assinatura também cobre o período em que ficou desconectado.
      if (active && status === 'SUBSCRIBED') changed()
    })
  }).catch(() => { /* Sem canal, as consultas periódicas continuam disponíveis. */ })

  return () => {
    active = false
    const cleanup = opening.then(async () => {
      if (channel) await client.removeChannel(channel)
    }).catch(() => { /* A limpeza não interrompe login ou troca de conta. */ })
    pendingCleanup.set(client, cleanup)
    void cleanup.then(() => {
      if (pendingCleanup.get(client) === cleanup) pendingCleanup.delete(client)
    })
  }
}
