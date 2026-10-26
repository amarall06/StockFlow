import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthScreen, Brand } from './components/AuthScreen'
import { ModuleBoundary, ModuleLoadError, ModuleLoading } from './components/ModuleBoundary'
import { supabase } from './lib/supabase'
import './App.css'

// A tela de login não precisa baixar os módulos operacionais.
const InventoryApp = lazy(() => import('./InventoryApp'))

type AuthView =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'inactive'; email: string }
  | { status: 'ready'; userId: string; email: string; displayName: string | null; role: string }
  | { status: 'error'; message: string }

// Confere no banco se a conta autenticada tem um perfil ativo antes de exibir a interface.
function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return window.localStorage.getItem('liber-automotive-theme') === 'dark' } catch { return false }
  })
  const toggleTheme = () => setIsDarkMode((current) => !current)
  useEffect(() => {
    try { window.localStorage.setItem('liber-automotive-theme', isDarkMode ? 'dark' : 'light') } catch { /* O tema continua funcionando em memória. */ }
  }, [isDarkMode])
  const [authView, setAuthView] = useState<AuthView>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setAuthView({ status: 'error', message: import.meta.env.PROD ? 'A conexão com o serviço de dados não está configurada. Peça ao administrador para verificar a publicação.' : 'A configuração local do Supabase está ausente. Confira o arquivo .env.local.' })
      return
    }

    let isMounted = true

    let profileRevision=0
    async function loadUserProfile(user: User) {
      if (!supabase) return
      const revision=++profileRevision
      const { data, error } = await supabase
        .from('profiles')
        .select('is_active, display_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted || revision!==profileRevision) return
      if (error) {
        setAuthView({ status: 'error', message: `Não foi possível carregar seu perfil: ${error.message}` })
        return
      }
      if (!data) {
        setAuthView({ status: 'error', message: 'A conta não possui perfil no sistema. Peça ao administrador para verificar o cadastro.' })
        return
      }
      if (!data.is_active) {
        setAuthView({ status: 'inactive', email: user.email ?? '' })
        return
      }
      setAuthView({ status: 'ready', userId: user.id, email: user.email ?? '', displayName: data.display_name, role: data.role })
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setAuthView({ status: 'error', message: 'Não foi possível verificar a sessão. Atualize a página e tente novamente.' })
      } else if (data.session?.user) {
        void loadUserProfile(data.session.user)
      } else {
        setAuthView({ status: 'signed-out' })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // O microtask evita iniciar uma consulta Supabase dentro do callback interno de autenticação.
      queueMicrotask(() => {
        if (!isMounted) return
        if (session?.user) {
          const nextUser=session.user
          // Não conservar a tela/pedido da conta anterior enquanto carrega outro perfil.
          setAuthView(current=>current.status==='ready'&&current.userId===nextUser.id?current:{status:'loading'})
          void loadUserProfile(nextUser)
        } else {profileRevision++;setAuthView({ status: 'signed-out' })}
      })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setLoginError('')
    setIsSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setIsSubmitting(false)
    if (error) setLoginError('Não foi possível entrar. Confira o e-mail e a senha.')
    else setPassword('')
  }

  async function handleSignOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setLoginError('Não foi possível encerrar a sessão. Tente novamente.')
  }

  if (authView.status === 'loading') {
    return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}><section className="auth-card"><p>Conectando ao LIBER automotive…</p></section></AuthScreen>
  }

  if (authView.status === 'ready') {
    return <ModuleBoundary fallback={<AuthScreen dark={isDarkMode} onToggle={toggleTheme}><ModuleLoadError /></AuthScreen>}><Suspense fallback={<AuthScreen dark={isDarkMode} onToggle={toggleTheme}><ModuleLoading /></AuthScreen>}><InventoryApp key={authView.userId} userId={authView.userId} onSignOut={handleSignOut} displayName={authView.displayName || authView.email || 'Usuário'} userRole={authView.role}
      profileName={authView.displayName} email={authView.email}
      isDarkMode={isDarkMode} onToggleTheme={toggleTheme}
      onProfileUpdated={(name) => setAuthView((current) => current.status === 'ready' ? { ...current, displayName: name } : current)} /></Suspense></ModuleBoundary>
  }

  if (authView.status === 'inactive') {
    return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}><section className="auth-card"><Brand /><h1>Acesso aguardando liberação</h1><p>A conta <strong>{authView.email}</strong> foi criada, mas ainda não está ativa. Peça ao administrador para aprovar o acesso.</p><button className="auth-secondary-button" type="button" onClick={handleSignOut}>Sair</button></section></AuthScreen>
  }

  if (authView.status === 'error') {
    return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}><section className="auth-card"><Brand /><h1>Não foi possível abrir o sistema</h1><p className="auth-error" role="alert">{authView.message}</p>{loginError && <p className="auth-error" role="alert">{loginError}</p>}<button className="auth-secondary-button" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section></AuthScreen>
  }

  return <AuthScreen dark={isDarkMode} onToggle={toggleTheme}>
    <section className="auth-card">
      <Brand />
      <p className="auth-eyebrow">CONTROLE DE ESTOQUE</p>
      <h1>Entrar no sistema</h1>
      <p className="auth-description">Use seu e-mail e senha cadastrados no LIBER automotive.</p>
      <form className="auth-form" onSubmit={handleLogin}>
        <label htmlFor="login-email">E-mail</label>
        <input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="login-password">Senha</label>
        <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {loginError && <p className="auth-error" role="alert">{loginError}</p>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </section>
  </AuthScreen>
}

export default App
