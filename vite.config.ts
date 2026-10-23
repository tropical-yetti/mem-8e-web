// SPDX-License-Identifier: GPL-3.0-or-later
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string
}

/** Commit de onde o site foi gerado (vazio sem git, por exemplo num pacote baixado). */
function commit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

export default defineConfig({
  // Versão do site, mostrada no rodapé e na página Sobre.
  define: { __VERSAO__: JSON.stringify(version), __COMMIT__: JSON.stringify(commit()) },
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
      // O núcleo e a lógica sem tela: store, experimentos e guia. Os componentes
      // são cobertos pelos testes de ponta a ponta.
      include: ['src/core/**', 'src/stores/**', 'src/experimentos/*.ts', 'src/guia/guia.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        // Meta do plano para o núcleo (desde a 0.2).
        'src/core/**': { lines: 95, branches: 90 },
        // Meta da 1.0 para a lógica entre o núcleo e a tela (#36).
        'src/stores/**': { lines: 90, branches: 85 },
        'src/experimentos/*.ts': { lines: 90, branches: 85 },
        'src/guia/guia.ts': { lines: 90, branches: 85 },
      },
    },
  },
})
