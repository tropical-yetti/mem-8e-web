/**
 * O job de ponta a ponta roda na imagem oficial do Playwright. Os navegadores
 * da imagem só servem para a mesma versão do @playwright/test: se uma
 * atualização mudar uma sem a outra, este teste avisa antes do CI quebrar.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

describe('CI', () => {
  it('a imagem do Playwright tem a mesma versão do @playwright/test', () => {
    const pacote = JSON.parse(ler('package.json')) as { devDependencies: Record<string, string> }
    const versao = pacote.devDependencies['@playwright/test']
    expect(versao).toMatch(/^\d+\.\d+\.\d+$/) // versão exata, sem ^ nem ~
    expect(ler('.github/workflows/ci.yml')).toContain(`mcr.microsoft.com/playwright:v${versao}-`)
  })
})
