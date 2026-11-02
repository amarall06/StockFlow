import {useEffect,useRef,useState} from 'react'
import {loadTeamMembers,saveTeamAccess,teamRoles,type TeamMember,type TeamRole} from '../lib/team-access-api'
import './TeamAccess.css'

function AccessEditor({original,onClose,onSaved}:{original:TeamMember;onClose:()=>void;onSaved:()=>void}){
  const[name,setName]=useState(original.display_name??''),[role,setRole]=useState(original.role),[active,setActive]=useState(original.is_active)
  const[confirmed,setConfirmed]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('')
  const busy=useRef(false),attempt=useRef<{fingerprint:string;id:string}|null>(null),alive=useRef(true)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  return <form className="team-access-form" aria-label="Editar acesso da equipe" onSubmit={async event=>{
    event.preventDefault();if(busy.current||!confirmed)return
    busy.current=true;setPending(true);setError('')
    try{
      const member={...original,display_name:name.trim(),role,is_active:active},fingerprint=JSON.stringify(member)
      if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()}
      await saveTeamAccess(member,attempt.current.id)
      if(alive.current)onSaved()
    }catch(caught){if(alive.current)setError(caught instanceof Error?caught.message:'Não foi possível confirmar a alteração.')}
    finally{busy.current=false;if(alive.current)setPending(false)}
  }}>
    <h3>Editar {original.display_name||'conta sem nome'}</h3>
    <p>Identificador: {original.id}. A confirmação altera os acessos desta conta. Suspender bloqueia novas operações protegidas; não apaga a conta nem os registros anteriores.</p>
    <fieldset disabled={pending}><legend>Identificação e permissão</legend>
      <label>Nome do funcionário<input required maxLength={80} value={name} onChange={event=>{setName(event.target.value);setConfirmed(false)}}/></label>
      <label>Função do funcionário<select value={role} onChange={event=>{setRole(event.target.value as TeamRole);setConfirmed(false)}}>{Object.entries(teamRoles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label><input type="checkbox" checked={active} onChange={event=>{setActive(event.target.checked);setConfirmed(false)}}/>Acesso ativo</label>
      <label><input type="checkbox" required checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>Conferi a identidade da pessoa e autorizo esta função e situação de acesso.</label>
      <button className="theme-toggle" type="submit" disabled={!confirmed||!name.trim()}>{pending?'Confirmando acesso…':'Confirmar alteração de acesso'}</button>
      <button className="theme-toggle" type="button" onClick={onClose}>Fechar edição de acesso</button>
    </fieldset>
    {error&&<p role="alert">{error}</p>}
  </form>
}
export function TeamAccess(){
  const[members,setMembers]=useState<TeamMember[]|null>(null),[ownId,setOwnId]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true)
  const[revision,setRevision]=useState(0),[editing,setEditing]=useState<TeamMember|null>(null),[filter,setFilter]=useState('all')
  useEffect(()=>{
    let live=true;const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),15000)
    void loadTeamMembers(controller.signal).then(result=>{if(live){setMembers(result.members);setOwnId(result.ownId)}}).catch(caught=>{if(live)setError(caught instanceof Error?caught.message:'Não foi possível consultar a equipe.')}).finally(()=>{window.clearTimeout(timeout);if(live)setLoading(false)})
    return()=>{live=false;controller.abort();window.clearTimeout(timeout)}
  },[revision])
  const visible=members?.filter(member=>filter==='all'||member.role===filter)??[]
  function refresh(){setLoading(true);setError('');setMembers(null);setRevision(value=>value+1)}
  return <section className="inventory-panel team-access" aria-label="Gestão da equipe">
    <h2>Gestão da equipe</h2><p>Contas cadastradas no sistema. Cada pessoa deve usar sua própria conta para identificar quem recebeu, testou ou movimentou caixas.</p>
    <p>Esta tela gerencia acessos existentes. Senhas e criação de credenciais ficam no serviço de contas.</p>
    <button className="theme-toggle" type="button" disabled={loading||Boolean(editing)} onClick={()=>{setMessage('');refresh()}}>Atualizar equipe</button>
    {loading&&<p role="status">Consultando equipe…</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {members&&<><p>{members.length} contas · {members.filter(member=>member.is_active&&member.role==='tester').length} testadores ativos.</p>
      <label>Filtrar equipe por função<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todas as funções</option>{Object.entries(teamRoles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <ul>{visible.map(member=><li key={member.id}><strong>{member.display_name||'Nome não informado'}</strong><span>{teamRoles[member.role]} · {member.is_active?'Ativo':'Suspenso'}</span><small>Identificador: {member.id}</small>{member.id===ownId?<p>Sua conta: função e ativação preservadas. Edite o nome em Meu perfil.</p>:<button className="theme-toggle" type="button" disabled={Boolean(editing)} onClick={()=>{setMessage('');setEditing(member)}}>Editar acesso de {member.display_name||member.id}</button>}</li>)}</ul>
      {!visible.length&&<p>Nenhuma conta nesta seleção.</p>}
    </>}
    {editing&&<AccessEditor key={editing.id} original={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setMessage('Alteração de acesso confirmada. Consultando a situação atual da equipe.');refresh()}}/>}
  </section>
}
