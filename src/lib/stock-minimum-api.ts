import {supabase} from './supabase'
import {parseMinimum} from './stock-alerts'

export async function saveStockMinimum(code:string,value:string,expected:string,requestId:string){
  const minimum=parseMinimum(value)
  if(!supabase)throw new Error('Banco não configurado.')
  const {data,error}=await supabase.rpc('set_product_minimum',{p_code:code,p_minimum:minimum,p_expected_updated_at:expected,p_request_id:requestId})
  if(error){
    if(error.code==='40001')throw new Error('Outra alteração foi salva. Feche a janela e atualize os dados antes de editar novamente.')
    if(error.code==='42501')throw new Error('Somente Administrador pode alterar o estoque mínimo.')
    throw new Error('Não foi possível confirmar. Tente novamente com os mesmos dados para conferir o envio.')
  }
  if(!data?.minimum_updated_at)throw new Error('A confirmação não chegou. Tente novamente com os mesmos dados.')
}
