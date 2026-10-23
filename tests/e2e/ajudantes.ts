/**
 * Ajudantes comuns dos testes de ponta a ponta.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** As regras da meta do projeto: WCAG 2.2, nível AA. */
const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Roda o axe na página e falha se houver problemas graves ou críticos. A
 * mensagem diz a regra, o que ela pede e onde está o problema.
 */
export async function semProblemasGraves(page: Page, onde?: string) {
  const resultado = await new AxeBuilder({ page }).withTags(REGRAS).analyze()
  const graves = resultado.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    graves.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`),
    onde,
  ).toEqual([])
}

/** Uma posição da grade. O leitor de tela só vê a do foco; o teste encontra todas. */
export const celula = (page: Page, endereco: string) =>
  page.locator(`td[data-endereco="${endereco}"]`)

/** Põe um endereço no MAR pela caixa de texto. */
export async function porNoMar(page: Page, valor: string) {
  const campo = page.getByRole('textbox', { name: 'MAR em hexadecimal' })
  await campo.fill(valor)
  await campo.press('Enter')
}
