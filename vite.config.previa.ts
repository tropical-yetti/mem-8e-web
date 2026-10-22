// Versão do site em um único arquivo HTML, para prévias (por exemplo, como
// página privada antes de o GitHub Pages estar ativo).
// SPDX-License-Identifier: GPL-3.0-or-later
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

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
  base: './',
  plugins: [
    vue(),
    VueI18nPlugin({
      include: fileURLToPath(new URL('./src/locales/**', import.meta.url)),
      runtimeOnly: true,
      compositionOnly: true,
      fullInstall: false,
    }),
    viteSingleFile(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist-previa' },
})
