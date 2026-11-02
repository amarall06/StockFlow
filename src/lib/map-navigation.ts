export function locateMissionShelf(userId: string, location: string) {
  if (!document.getElementById('fictional-map-details')) throw Error('O mapa não está disponível. Confira a configuração da planta.')
  window.dispatchEvent(new CustomEvent('liber:mission-location', { detail: { userId, location } }))
}
export function subscribeMissionLocation(userId: string, show: (location: string) => void) {
  const listener = (event: Event) => {
    const value = (event as CustomEvent).detail
    if (value?.userId === userId && ['NORTE', 'SUL', 'LESTE', 'OESTE'].includes(value.location)) show(value.location)
  }
  window.addEventListener('liber:mission-location', listener)
  return () => window.removeEventListener('liber:mission-location', listener)
}
