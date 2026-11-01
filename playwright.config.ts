import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://stockflow-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key' },
  },
})
