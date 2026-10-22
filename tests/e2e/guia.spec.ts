/**
 * Guia de primeiro acesso: abre sozinho na primeira visita, anda pelos
 * passos, é lembrado, e cada "?" abre só o balão da sua parte.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('primeiro acesso', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('o guia abre sozinho e percorre todos os passos', async ({ page }) => {
    await page.goto('./')
    const balao = page.getByRole('dialog')
    await expect(balao).toContainText('1 de 8')
    await expect(page.getByRole('heading', { name: 'A memória, aberta' })).toBeFocused()

    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByRole('heading', { name: 'MAR: o endereço' })).toBeVisible()

    // O balão não bloqueia a página: dá para experimentar o que ele sugere.
    await page.getByRole('button', { name: 'A7 = 0' }).click()
    await expect(page.getByRole('textbox', { name: 'MAR em hexadecimal' })).toHaveValue('80')
    await expect(balao).toBeVisible()

    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(balao).toContainText('1 de 8')
    for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByRole('heading', { name: 'Pronto' })).toBeVisible()
    await page.getByRole('button', { name: 'Começar' }).click()
    await expect(balao).toBeHidden()

    // Visto uma vez, não abre de novo.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Simulador da memória' })).toBeVisible()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('Esc fecha o guia e conta como visto', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Simulador da memória' })).toBeVisible()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  for (const tema of ['light', 'dark'] as const) {
    test(`balão sem problemas graves de acessibilidade, tema ${tema}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema })
      await page.goto('./')
      await page.getByRole('button', { name: 'Próximo' }).click()
      await expect(page.getByRole('heading', { name: 'MAR: o endereço' })).toBeVisible()
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
})

test('o botão "?" abre só o balão daquela parte, e o foco volta para ele', async ({ page }) => {
  await page.goto('./')
  const ajuda = page.getByRole('button', { name: 'Ajuda: Diagrama de tempo' })
  await ajuda.click()
  const balao = page.getByRole('dialog')
  await expect(balao).toContainText('Diagrama de tempo')
  await expect(balao).not.toContainText('de 8')
  await page.getByRole('button', { name: 'Entendi' }).click()
  await expect(balao).toBeHidden()
  await expect(ajuda).toBeFocused()
})

test('"Ver o guia" abre o guia completo de novo', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Ver o guia' }).click()
  await expect(page.getByRole('dialog')).toContainText('1 de 8')
  await page.getByRole('button', { name: 'Pular o guia' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})
