/**
 * Leitor de tela virtual (Guidepup Virtual Screen Reader) dentro da página
 * do Playwright. Ele percorre a árvore de acessibilidade como um leitor de
 * tela e registra as frases que seriam ditas. É uma simulação: complementa,
 * mas não substitui, o teste com leitores reais (issue #36).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

const require = createRequire(import.meta.url)
const CAMINHO = require
  .resolve('@guidepup/virtual-screen-reader/package.json')
  .replace(/package\.json$/, 'lib/esm/index.browser.js')
const CODIGO = readFileSync(CAMINHO, 'utf8')
const URL_LEITOR = 'http://localhost:4173/__leitor-virtual.js'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    leitor: any
  }
}

/** Carrega o leitor na página e o liga sobre o documento inteiro. */
export async function ligarLeitor(page: Page) {
  await page.route(URL_LEITOR, (rota) =>
    rota.fulfill({ body: CODIGO, contentType: 'text/javascript' }),
  )
  await page.addScriptTag({
    type: 'module',
    content: `import { virtual } from '${URL_LEITOR}'; window.leitor = virtual;`,
  })
  await page.waitForFunction(() => window.leitor !== undefined)
  await page.evaluate(() => window.leitor.start({ container: document.body }))
}

/** Lê do ponto atual até o fim do documento (ou até `limite` passos). */
export async function lerTudo(page: Page, limite = 4000): Promise<string[]> {
  return page.evaluate(async (max) => {
    for (let i = 0; i < max; i++) {
      if ((await window.leitor.lastSpokenPhrase()) === 'end of document') break
      await window.leitor.next()
    }
    return window.leitor.spokenPhraseLog()
  }, limite)
}

export const frases = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.leitor.spokenPhraseLog())

export const limparFrases = (page: Page) =>
  page.evaluate(() => window.leitor.clearSpokenPhraseLog())

export const desligarLeitor = (page: Page) => page.evaluate(() => window.leitor.stop())
