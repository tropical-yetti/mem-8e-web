/**
 * Site: as páginas abrem, o idioma troca e não há problemas graves de
 * acessibilidade (axe), nos temas claro e escuro.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function auditar(page: Page, onde: string) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const graves = resultado.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    graves.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`),
    onde,
  ).toEqual([])
}

test('a página inicial abre em português', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Simulador da memória')
})

test('o idioma troca para inglês e é lembrado', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Idioma').selectOption('en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Memory simulator')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Memory simulator')
})

test('a página Sobre credita o CPU-8E e traz a licença', async ({ page }) => {
  await page.goto('./#/sobre')
  await expect(page.getByRole('link', { name: 'CPU-8E Web' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Joel Guilherme da Silva Filho' })).toHaveAttribute(
    'href',
    'http://lattes.cnpq.br/7746085908957322',
  )
  await expect(
    page.getByRole('link', { name: 'Ler o texto completo da licença (GPL-3.0)' }),
  ).toBeVisible()
})

for (const tema of ['light', 'dark'] as const) {
  test.describe(`tema ${tema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: tema })

    for (const [nome, caminho] of [
      ['simulador', './'],
      ['sobre', './#/sobre'],
    ] as const) {
      test(`${nome} não tem problemas graves de acessibilidade`, async ({ page }) => {
        await page.goto(caminho)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await auditar(page, nome)
      })
    }
  })
}
