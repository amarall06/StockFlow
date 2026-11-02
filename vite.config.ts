import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: { manifest: true, rolldownOptions: { input: { app: fileURLToPath(new URL('./index.html', import.meta.url)), presentation: fileURLToPath(new URL('./demonstracao.html', import.meta.url)) } } },
})
