import { createClient } from '@supabase/supabase-js'

// O Vite lê estes valores do arquivo local .env.local, que não vai para o Git.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// A chave publicável pode ser usada no navegador quando as regras RLS estiverem configuradas.
const hasSupabaseConfiguration = Boolean(supabaseUrl && supabasePublishableKey)

// Cria o cliente sem enviar requisições até alguma parte da aplicação consultá-lo.
export const supabase = hasSupabaseConfiguration
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null

// Permite que a interface saiba se os valores locais foram preenchidos.
export const isSupabaseConfigured = hasSupabaseConfiguration
