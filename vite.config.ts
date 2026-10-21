// SPDX-License-Identifier: GPL-3.0-or-later
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string
}

export default defineConfig({
  // Versão do site, mostrada no rodapé e na página Sobre.
  define: { __VERSAO__: JSON.stringify(version) },
  // O site é publicado em https://<usuario>.github.io/mem-8e-web/
  base: '/mem-8e-web/',
  plugins: [
    vue(),
    // Mensagens de tradução pré-compiladas: menos código no site e nenhuma
    // avaliação de texto como código em tempo de execução.
    VueI18nPlugin({
      include: fileURLToPath(new URL('./src/locales/**', import.meta.url)),
      runtimeOnly: true,
      compositionOnly: true,
      fullInstall: false,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
    coverage: {
      include: ['src/core/**'],
      reporter: ['text', 'html'],
      // Meta do plano para o núcleo (vale a partir da 0.2, quando ele chegar).
      thresholds: { 'src/core/**': { lines: 95, branches: 90 } },
    },
  },
})
