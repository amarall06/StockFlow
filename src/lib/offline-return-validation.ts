import { allowedReturnStatuses, type WarrantyReturn, type WarrantyReturnInput } from './warranty-returns'
export function validateOfflineReturn(input: WarrantyReturnInput, previous?: WarrantyReturn) {
  if (!input || !Number.isSafeInteger(input.boxes) || input.boxes < 1 || input.boxes > 2147483647 || !['shock','spring','unknown'].includes(input.product_kind) || !['unknown','ours','other'].includes(input.ownership)) throw new Error('Confira categoria, identificação e quantidade da devolução.')
  for (const [value, max, required] of [[input.description,300,true],[input.reason,500,true],[input.location,100,true],[input.product_code,60,false],[input.destination,300,false]] as const) if(typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Confira descrição, motivo, local, código e destino da devolução.')
  if (!previous) {
    if(input.status !== 'received' || input.manufacturer_id !== null || input.destination !== '') throw new Error('Confira descrição, motivo, local e quantidade da devolução recebida.')
    return
  }
  if (previous.status === 'closed' || !allowedReturnStatuses(input).includes(input.status) || (input.status === 'closed' && !input.destination.trim()) || (input.status === 'warranty' && (!input.manufacturer_id || input.ownership !== 'ours' || input.product_kind === 'unknown'))) throw new Error('Confira o andamento e o destino; devoluções encerradas não podem ser alteradas.')
  if (previous.status === 'warranty' && (!['warranty','closed'].includes(input.status) || ['manufacturer_id','product_kind','boxes','product_code','ownership'].some(key => input[key as keyof WarrantyReturnInput] !== previous[key as keyof WarrantyReturnInput]))) throw new Error('A identificação e quantidade de uma devolução em garantia devem ser preservadas.')
}
