// Confirma antes de criar um pedido ou enviar a operação ao servidor.
export function confirmOperation(title: string, details: string[]) {
  return window.confirm([title, ...details, 'Confira os dados antes de continuar. O servidor validará a operação.'].join('\n'))
}
