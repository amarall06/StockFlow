import { useState, type FormEvent } from 'react'
import { updateOwnDisplayName } from '../lib/profile-api'
import './ProfileSettings.css'

const roleLabels: Record<string, string> = {
  administrator: 'Administrador', receiving: 'Recebimento', tester: 'Testador', stockkeeper: 'Estoquista', viewer: 'Consulta',
}

export function ProfileSettings({ displayName, email, role, apiVersion, onUpdated }: {
  displayName: string | null; email: string; role: string; apiVersion: number; onUpdated: (name: string) => void
}) {
  const [name, setName] = useState(displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const ready = apiVersion >= 5

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const savedName = await updateOwnDisplayName(name)
      onUpdated(savedName)
      setName(savedName)
      setMessage('Nome salvo. Ele já aparece na sua conta e pode ser usado nos históricos.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar seu nome.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">MINHA CONTA</p><h1>Meu perfil</h1><p className="subtitle">Escolha o nome que identifica você nos registros do sistema.</p></div></div>
    <section className="inventory-panel profile-panel" aria-label="Dados do meu perfil">
      <dl className="profile-account"><div><dt>E-mail da conta</dt><dd>{email}</dd></div><div><dt>Função de acesso</dt><dd>{roleLabels[role] ?? 'Não informada'}</dd></div></dl>
      {!ready && <p className="profile-notice" role="status">A alteração do nome aguarda ativação no banco. Se a atualização já foi aplicada, recarregue a página.</p>}
      <form className="profile-form" onSubmit={saveProfile}>
        <label htmlFor="profile-display-name">Nome exibido</label>
        <input id="profile-display-name" value={name} onChange={(event) => { setName(event.target.value); setMessage(''); setError('') }} autoComplete="name" maxLength={80} required placeholder="Como você quer aparecer no sistema" disabled={!ready || saving} aria-describedby="profile-name-help" />
        <p id="profile-name-help">Esse nome identifica o responsável por entradas, transferências e alterações de aplicações, tanto de amortecedores quanto de molas quando a operação se aplicar.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="profile-success" role="status">{message}</p>}
        <button className="add-product-button" type="submit" disabled={!ready || saving || !name.trim() || name.trim() === (displayName ?? '')}>{saving ? 'Salvando…' : 'Salvar nome'}</button>
      </form>
    </section>
  </>
}
