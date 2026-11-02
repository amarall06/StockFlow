import {supabase} from './supabase'
import {readAllRows} from './read-all-rows'

export const teamRoles={administrator:'Administrador',receiving:'Recebimento',tester:'Testador',stockkeeper:'Estoquista',viewer:'Consulta'}
export type TeamRole=keyof typeof teamRoles
export type TeamMember={id:string;display_name:string|null;role:TeamRole;is_active:boolean;access_revision:number}
export function parseTeamMember(value:unknown):TeamMember{
  const row=value as TeamMember
  if(!row||typeof row.id!=='string'||!row.id||!(row.display_name===null||typeof row.display_name==='string')||!Object.hasOwn(teamRoles,row.role)||typeof row.is_active!=='boolean'||!Number.isSafeInteger(row.access_revision)||row.access_revision<1)throw Error('O servidor retornou uma conta incompleta. Consulte novamente antes de editar.')
  return row
}
export async function loadTeamMembers(signal:AbortSignal){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const client=supabase
  // A verificação também impede que uma resposta filtrada por RLS pareça uma lista completa.
  const {data:auth,error:authError}=await client.auth.getUser()
  if(authError||!auth.user)throw Error('Entre novamente para consultar a equipe.')
  const {data:own,error:ownError}=await client.from('profiles').select('role,is_active').eq('id',auth.user.id).abortSignal(signal).single()
  if(ownError||own?.role!=='administrator'||!own.is_active)throw Error('Somente Administrador ativo pode consultar a equipe.')
  const {data,error}=await readAllRows((from,to)=>client.from('profiles').select('id,display_name,role,is_active,access_revision').order('id').range(from,to).abortSignal(signal))
  if(error)throw Error('Não foi possível consultar a equipe. Confira a conexão e seu acesso.')
  return {members:(data??[]).map(parseTeamMember),ownId:auth.user.id}
}
export async function saveTeamAccess(member:TeamMember,requestId:string){
  if(!supabase)throw Error('Não foi possível conectar ao banco.')
  const {data,error}=await supabase.rpc('save_team_access',{p_target_id:member.id,p_expected_revision:member.access_revision,p_role:member.role,p_active:member.is_active,p_display_name:member.display_name?.trim(),p_request_id:requestId}).abortSignal(AbortSignal.timeout(15000))
  if(error){
    if(error.code==='40001')throw Error('O acesso mudou em outra janela. Feche a edição e consulte a equipe novamente. Seu preenchimento foi mantido.')
    if(error.code==='42501')throw Error('Seu acesso não permite gerenciar a equipe. Entre novamente para conferir sua função.')
    throw Error('Não foi possível confirmar a alteração. Confira a conexão e tente salvar novamente com o mesmo preenchimento para recuperar a confirmação.')
  }
  return parseTeamMember(data)
}
