import { useEffect, useState, useSyncExternalStore } from 'react'
const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener) }
}
export function ConnectionStatus({ consultedAt }: { consultedAt: string }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  const [reconnecting,setReconnecting]=useState(false)
  useEffect(()=>{const resumed=()=>setReconnecting(true);window.addEventListener('online',resumed);return()=>window.removeEventListener('online',resumed)},[])
  useEffect(()=>{if(consultedAt)setReconnecting(false)},[consultedAt])
  if (online) return reconnecting?<p className="auth-error" role="status">Conexão restabelecida. Conferindo os saldos com o servidor; os valores da consulta anterior continuam na tela.</p>:null
  return <p className="auth-error" role="status">Sem conexão. A tela conserva a consulta de {consultedAt ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }).format(new Date(consultedAt)) : 'antes da desconexão'}. Os saldos podem ter mudado em outro aparelho. Operações precisam de confirmação do servidor. <a href="/offline.html">Abrir consulta e rascunhos offline</a>. A cópia salva é válida por 15 minutos; rascunhos não alteram saldos.</p>
}
