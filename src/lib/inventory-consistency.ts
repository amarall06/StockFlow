import { isSpringCode } from './product-category'

export class InventoryConsistencyError extends Error {}
export function validateBalance({ quantity, status, code, locationKnown }: { quantity: number; status: string; code?: string; locationKnown: boolean }) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new InventoryConsistencyError('Foi encontrado um saldo inválido. Peça ao administrador para conferir os registros; o sistema não corrigiu nenhuma caixa automaticamente.')
  if (quantity === 0) return
  if (!code || !locationKnown) throw new InventoryConsistencyError('Há saldo com produto ou prateleira indisponível nesta consulta. Peça ao administrador para conferir os cadastros e permissões.')
  if (isSpringCode(code) ? status !== 'in_stock' : !['awaiting_test', 'released_for_sale'].includes(status)) throw new InventoryConsistencyError('Foi encontrada uma situação incompatível com a categoria do produto. Peça ao administrador para conferir os registros.')
}
