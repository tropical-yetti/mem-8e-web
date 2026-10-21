// Testes de ponta a ponta: abrem o site num navegador de verdade.
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/mem-8e-web/',
    locale: 'pt-BR',
    // Permite usar um Chromium já instalado (CHROMIUM_PATH) em vez do baixado pelo Playwright.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] }
      : {},
  },
  // Com CHROMIUM_PATH (ambiente sem os navegadores do Playwright), só os projetos Chromium.
  projects: [
    { name: 'computador', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'tablet', use: { ...devices['Galaxy Tab S4'] } },
    ...(process.env.CHROMIUM_PATH
      ? []
      : [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'safari', use: { ...devices['Desktop Safari'] } },
          { name: 'iphone', use: { ...devices['iPhone 13'] } },
        ]),
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/mem-8e-web/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
