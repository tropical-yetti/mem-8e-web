/**
 * Simulador: editar o MAR e a memória, ler e escrever passo a passo, e o
 * conflito no barramento de dados.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Conteúdo inicial do endereço 3A (veja CONTEUDO_INICIAL na store). */
const M3A = ((0x3a * 0x9d + 0x37) & 0xff).toString(16).toUpperCase().padStart(2, '0')

async function porNoMar(page: Page, valor: string) {
  const campo = page.getByRole('textbox', { name: 'MAR em hexadecimal' })
  await campo.fill(valor)
  await campo.press('Enter')
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('mudar um bit do MAR move o endereço marcado na grade', async ({ page }) => {
  await porNoMar(page, '3A')
  await expect(page.locator('td[aria-current="location"]')).toHaveAttribute(
    'aria-label',
    `Endereço 3A: ${M3A}`,
  )
  await page.getByRole('button', { name: 'A7 = 0' }).click()
  await expect(page.getByRole('textbox', { name: 'MAR em hexadecimal' })).toHaveValue('BA')
  await expect(page.locator('td[aria-current="location"]')).toHaveAttribute(
    'aria-label',
    /^Endereço BA/,
  )
})

test('clicar numa posição põe o endereço no MAR', async ({ page }) => {
  await page.getByRole('cell', { name: /^Endereço 5C/ }).click()
  await expect(page.getByRole('textbox', { name: 'MAR em hexadecimal' })).toHaveValue('5C')
})

test('editar uma posição pelo teclado', async ({ page }) => {
  const celula = page.getByRole('cell', { name: /^Endereço 00/ })
  await celula.click()
  await celula.press('ArrowRight')
  await page.keyboard.press('A')
  await page.keyboard.press('B')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('cell', { name: 'Endereço 01: AB' })).toBeFocused()
})

test('leitura passo a passo, da seleção da linha até o MDR', async ({ page }) => {
  await porNoMar(page, '3A')
  await page.getByRole('button', { name: 'Ler o endereço 3A' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Endereço no BE' })).toHaveAttribute(
    'aria-current',
    'step',
  )
  await page.getByRole('button', { name: 'Próxima fase' }).click()
  // Com o CS ligado, a linha 3 e a coluna A acendem.
  await expect(page.getByRole('rowheader', { name: '3' })).toHaveClass(/ativa/)
  await expect(page.getByRole('columnheader', { name: 'A', exact: true })).toHaveClass(/ativa/)
  await page.getByRole('button', { name: 'Ir até o fim' }).click()
  await expect(page.getByText(`Leitura concluída: M[3A] → MDR = ${M3A}.`)).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'MDR em hexadecimal' })).toHaveValue(M3A)
})

test('escrita passo a passo grava o MDR na posição do MAR', async ({ page }) => {
  await porNoMar(page, 'C4')
  const mdr = page.getByRole('textbox', { name: 'MDR em hexadecimal' })
  await mdr.fill('3E')
  await mdr.press('Enter')
  await page.getByRole('button', { name: 'Escrever 3E no endereço C4' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próxima fase' }).click()
  await expect(page.getByRole('cell', { name: 'Endereço C4: 3E' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir até o fim' }).click()
  await expect(page.getByText('Escrita concluída: M[C4] = 3E.')).toBeVisible()
})

test('CPU e memória no BD ao mesmo tempo: conflito', async ({ page }) => {
  await page.getByRole('button', { name: 'MDR → BD' }).click()
  await page.getByRole('button', { name: /^CS/ }).click()
  await page.getByRole('button', { name: /^RD/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'em conflito' })).toBeAttached()
})

for (const tema of ['light', 'dark'] as const) {
  test(`no meio de uma leitura, tema ${tema}, sem problemas graves de acessibilidade`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: tema })
    await page.getByRole('button', { name: /^Ler o endereço/ }).click()
    await page.getByRole('button', { name: 'Próxima fase' }).click()
    await page.getByRole('button', { name: 'Próxima fase' }).click()
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const graves = resultado.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(
      graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([])
  })
}
