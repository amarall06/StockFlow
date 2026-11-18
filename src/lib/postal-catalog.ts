import type { ProductInfo } from './product-details'
import { searchableProductText } from './product-details'
import { isSpringCode } from './product-category'

// Formato já consumido pelo aplicativo independente dos Correios.
export function serializePostalCatalog(catalog: Record<string, ProductInfo>): string {
  const rows = Object.entries(catalog)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, product]) => ({
      code,
      family: isSpringCode(code) ? 'Mola' : 'Amortecedor',
      description: searchableProductText(product),
    }))
  return JSON.stringify(rows, null, 2) + '\n'
}

export function downloadPostalCatalog(catalog: Record<string, ProductInfo>): void {
  const blob = new Blob([serializePostalCatalog(catalog)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'stockflow-catalog.json'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
