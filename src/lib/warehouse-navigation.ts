import type {StockRow} from './inventory-api'
export type WarehouseAction='inventory'|'outflow'|'history'
export type WarehouseActionHandler=(action:WarehouseAction,row:StockRow)=>void
