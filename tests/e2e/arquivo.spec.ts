/**
 * Conteúdo da memória em texto (ADR 0006): abrir, salvar, colar e copiar.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const celula = (page: Page, endereco: string) =>
  page.getByRole('cell', { name: new RegExp(`^Endereço ${endereco}:`) })

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

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('colar um texto substitui a memória', async ({ page }) => {
  await page.getByRole('button', { name: 'Colar texto…' }).click()
  const janela = page.getByRole('dialog', { name: 'Colar o conteúdo da memória' })
  await expect(janela).toBeVisible()
  await expect(janela.getByRole('textbox')).toBeFocused()
  await semViolacoes(page)

  await janela.getByRole('textbox').fill('# teste\n10: AB CD\nXX')
  await janela.getByRole('button', { name: 'Abrir na memória' }).click()
  await expect(janela).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'posições' })).toHaveText(
    '3 posições vieram do texto; as outras ficaram em 00.',
  )
  await expect(celula(page, '10')).toHaveAttribute('aria-label', 'Endereço 10: AB')
  await expect(celula(page, '11')).toHaveAttribute('aria-label', 'Endereço 11: CD')
  await expect(celula(page, '12')).toHaveAttribute('aria-label', /^Endereço 12: XX/)
  await expect(celula(page, '00')).toHaveAttribute('aria-label', 'Endereço 00: 00')
})

test('um texto com erro mostra linha e coluna e não muda a memória', async ({ page }) => {
  const antes = await celula(page, '10').getAttribute('aria-label')
  await page.getByRole('button', { name: 'Colar texto…' }).click()
  const janela = page.getByRole('dialog', { name: 'Colar o conteúdo da memória' })
  await janela.getByRole('textbox').fill('10: 01\n20: 02 G7')
  await janela.getByRole('button', { name: 'Abrir na memória' }).click()

  await expect(janela.getByRole('alert')).toHaveText(
    'Linha 2, coluna 8: “G7” não é um byte. Use 2 dígitos hexadecimais (3A), XX ou 8 dígitos 0, 1 ou X. A memória não mudou.',
  )
  await expect(janela.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  await semViolacoes(page)

  await janela.getByRole('button', { name: 'Cancelar' }).click()
  await expect(janela).toBeHidden()
  await expect(celula(page, '10')).toHaveAttribute('aria-label', antes!)
})

test('Esc fecha a janela de colar sem mudar nada', async ({ page }) => {
  const antes = await celula(page, '00').getAttribute('aria-label')
  await page.getByRole('button', { name: 'Colar texto…' }).click()
  const janela = page.getByRole('dialog', { name: 'Colar o conteúdo da memória' })
  await janela.getByRole('textbox').fill('00: 11')
  await page.keyboard.press('Escape')
  await expect(janela).toBeHidden()
  await expect(celula(page, '00')).toHaveAttribute('aria-label', antes!)
})

test('salvar e abrir de volta dá a mesma memória', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Salvar arquivo' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('memoria-mem-8e.txt')
  const caminho = await download.path()
  const texto = await readFile(caminho, 'utf8')
  expect(texto).toMatch(
    /^# MEM-8E Web: conteúdo da memória \(256 × 8\)\n# salvo em \d{4}-\d\d-\d\d, versão /,
  )
  expect(texto.split('\n').filter((l) => /^[0-9A-F]{2}: /.test(l))).toHaveLength(16)
  const antes = await celula(page, '3A').getAttribute('aria-label')

  await page.getByRole('button', { name: 'Zerar memória e registradores' }).click()
  await expect(celula(page, '3A')).toHaveAttribute('aria-label', 'Endereço 3A: 00')

  await page.getByTestId('arquivo-entrada').setInputFiles(caminho)
  await expect(page.getByRole('status').filter({ hasText: 'posições' })).toHaveText(
    '256 posições vieram do texto; as outras ficaram em 00.',
  )
  await expect(celula(page, '3A')).toHaveAttribute('aria-label', antes!)
})

test('abrir um arquivo com erro avisa e não muda a memória', async ({ page }) => {
  const antes = await celula(page, 'FF').getAttribute('aria-label')
  await page.getByTestId('arquivo-entrada').setInputFiles({
    name: 'errado.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('FF: 01 02\n'),
  })
  await expect(page.getByRole('status').filter({ hasText: 'Linha' })).toHaveText(
    'Linha 1, coluna 8: “02” passa do endereço FF, o último da memória. A memória não mudou.',
  )
  await expect(celula(page, 'FF')).toHaveAttribute('aria-label', antes!)
})

test('copiar põe o texto da memória na área de transferência', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'só o Chromium deixa o teste ler a área de transferência')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copiar texto' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'copiado' })).toBeVisible()
  const copiado = await page.evaluate(() => navigator.clipboard.readText())
  expect(copiado).toMatch(/^# MEM-8E Web/)
  expect(copiado).toContain('\nF0: ')
})
