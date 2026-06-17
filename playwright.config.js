import { defineConfig, devices } from '@playwright/test'

// Тесты гоняются против dev-сервера Vite (npm run dev).
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4, // ограничиваем, иначе много воркеров перегружают сервер и goto таймаутит
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:4173',
    navigationTimeout: 45000,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // мобильный viewport на chromium-эмуляции (без установки webkit)
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
  // статический preview собранного dist — стабильнее dev-сервера под параллелью
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
