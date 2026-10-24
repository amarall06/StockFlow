import { formatVehicleYears, shockTypeLabels, type ProductInfo } from '../lib/product-details'

// Mesma apresentação na consulta por código e nas linhas do estoque.
export function ProductApplications({ product }: { product?: ProductInfo }) {
  if (!product) return null
  return <span className="vehicle-applications">
    {product.vehicleApplications?.length
      ? product.vehicleApplications.map((application, index) => <span className="vehicle-application" key={`${application.vehicleModel}-${index}`}>
        <span className="vehicle-model">{application.vehicleModel}</span>
        <small className="vehicle-years">{formatVehicleYears(application)}</small>
      </span>)
      : <span className="vehicle-fallback">{product.application}</span>}
    {product.shockType && <small className="vehicle-shock-type">{shockTypeLabels[product.shockType]}</small>}
  </span>
}
