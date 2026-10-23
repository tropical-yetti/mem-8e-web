/**
 * Experimentos "e se…?" guiados (ADR 0005).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const graves = resultado.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

async function escolher(page: Page, titulo: string) {
  await page.getByRole('button', { name: 'Experimentos “e se…?”' }).click()
  const lista = page.getByRole('dialog', { name: 'Experimentos “e se…?”' })
  await lista.getByRole('button', { name: new RegExp(`^${titulo}`) }).click()
  await expect(lista).toBeHidden()
  return page.getByRole('dialog', { name: titulo })
}

const mar = (page: Page) => page.getByRole('textbox', { name: 'MAR em hexadecimal' })
const mdr = (page: Page) => page.getByRole('textbox', { name: 'MDR em hexadecimal' })

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('a lista mostra os cinco experimentos, sem problemas de acessibilidade', async ({ page }) => {
  await page.getByRole('button', { name: 'Experimentos “e se…?”' }).click()
  const lista = page.getByRole('dialog', { name: 'Experimentos “e se…?”' })
  await expect(lista.getByRole('listitem')).toHaveCount(5)
  await semViolacoes(page)
  await lista.getByRole('button', { name: 'Fechar' }).click()
  await expect(lista).toBeHidden()
})

test('contenção: pergunta, ação e resultado; sair desfaz tudo', async ({ page }) => {
  await mar(page).fill('77')
  await mar(page).press('Enter')
  const antes = await mdr(page).inputValue()

  const balao = await escolher(page, 'E se a CPU e a memória dirigirem o BD juntas?')
  await expect(balao).toContainText('Pense antes')
  await expect(balao.getByRole('heading')).toBeFocused()
  await expect(mar(page)).toHaveValue('3A')
  await semViolacoes(page)

  await balao.getByRole('button', { name: 'Vamos ver' }).click()
  await expect(balao).toContainText('Passo 1 de 1')
  await expect(balao).toContainText('o balão avança sozinho')
  await expect(balao.getByRole('button', { name: 'Próximo' })).toHaveCount(0)

  await page.getByRole('button', { name: 'MDR → BD' }).click()
  await expect(balao).toContainText('O que aconteceu')
  await expect(balao).toContainText('0XX1 1XX0')
  await expect(balao).toContainText('Em memórias reais:')
  await semViolacoes(page)

  await balao.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(balao).toBeHidden()
  await expect(mar(page)).toHaveValue('77')
  await expect(mdr(page)).toHaveValue(antes)
  await expect(page.getByRole('button', { name: 'MDR → BD' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('endereço trocado: a leitura continua e o MDR fica com X', async ({ page }) => {
  const balao = await escolher(page, 'E se o endereço mudar no meio da leitura?')
  await balao.getByRole('button', { name: 'Vamos ver' }).click()
  await page.getByRole('button', { name: 'Ler o endereço 10' }).click()
  await expect(balao).toContainText('Passo 2 de 4')
  await page.getByRole('button', { name: 'Próxima fase' }).click()
  await page.getByRole('button', { name: 'Próxima fase' }).click()
  await expect(balao).toContainText('Passo 3 de 4')

  await mar(page).fill('20')
  await mar(page).press('Enter')
  await expect(balao).toContainText('Passo 4 de 4')
  // A leitura não parou: a transação continua.
  await expect(page.getByRole('button', { name: 'Próxima fase' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir até o fim' }).click()

  await expect(balao).toContainText('O MDR ficou com X: nem 11, nem 22.')
  await expect(mdr(page)).toHaveValue('XX')
  await expect(page.getByText(/O endereço mudou de 10 para 20 em 40 ns/)).toBeVisible()
  await expect(page.getByText(/MAR muda \(40 ns\)/)).toBeVisible()
})

test('Esc sai do experimento e desfaz', async ({ page }) => {
  const balao = await escolher(page, 'E se o CS estiver desligado?')
  await balao.getByRole('button', { name: 'Vamos ver' }).click()
  await page.getByRole('button', { name: /^RD/ }).click()
  await expect(balao).toContainText('O que aconteceu')
  await page.keyboard.press('Escape')
  await expect(balao).toBeHidden()
  await expect(page.getByRole('button', { name: /^RD/ })).toHaveAttribute('aria-pressed', 'false')
})

test('abrir o guia encerra o experimento', async ({ page }) => {
  const balao = await escolher(page, 'E se RD e WR forem ligados juntos?')
  await page.getByRole('button', { name: 'Ver o guia' }).click()
  await expect(balao).toBeHidden()
  await expect(page.getByRole('dialog')).toContainText('1 de 8')
})
