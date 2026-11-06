import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  // Historical scenarios for the removed presentation, kept for reference.
  testIgnore: [
    '**/count-history-pages.spec.ts',
    '**/fictional-shelf-map.spec.ts',
    '**/floor-plan-desktop.spec.ts',
    '**/pick-list.spec.ts',
    '**/pick-cancellation.spec.ts',
    '**/pick-missions.spec.ts',
    '**/postal-returns.spec.ts',
    '**/presentation-cloud.spec.ts',
    '**/presentation-count-reviews.spec.ts',
    '**/presentation-counts.spec.ts',
    '**/presentation-recounts.spec.ts',
    '**/recurring-divergences.spec.ts',
    '**/shared-count-map.spec.ts',
    '**/shared-count-pending.spec.ts',
    '**/shared-layout-broadcast.spec.ts',
    '**/shared-layout.spec.ts',
    '**/shared-recurrence-rule.spec.ts',
    '**/shared-recurrence.spec.ts',
    '**/space-floor-plan.spec.ts',
    '**/stock-age.spec.ts',
    '**/testing-delay.spec.ts',
  ],
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://stockflow-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key' },
  },
})
