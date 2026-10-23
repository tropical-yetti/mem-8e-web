/**
 * Documentação: menu, navegação entre páginas, âncoras, idioma e
 * acessibilidade de cada página.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test } from '@playwright/test'
import { semProblemasGraves } from './ajudantes'

const PAGINAS = ['primeiros-passos', 'memoria', 'niveis', 'tempo', 'portas', 'roteiro', 'siglas']

test('o menu leva à documentação, e Próxima página avança', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Documentação' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primeiros passos')
  await page.getByRole('link', { name: 'Como a memória funciona →' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Como a memória funciona')
  await expect(page.getByRole('link', { name: 'Como a memória funciona' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('um link com âncora rola até a seção', async ({ page }) => {
  await page.goto('./#/documentacao/tempo#wait-states')
  await expect(page.getByRole('heading', { name: 'Wait states', exact: true })).toBeInViewport()
})

test('a tabela de siglas vem das mesmas mensagens das legendas, nos dois idiomas', async ({
  page,
}) => {
  await page.goto('./#/documentacao/siglas')
  await expect(page.getByRole('row', { name: /BE Barramento de endereços/ })).toBeVisible()
  await page.getByLabel('Idioma').selectOption('en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abbreviations')
  await expect(page.getByRole('row', { name: /AB Address bus/ })).toBeVisible()
})

test.describe('guia', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('"Ler mais" no balão abre a seção da documentação e fecha o guia', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('link', { name: 'Ler mais na documentação' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(
      page.getByRole('heading', { name: 'Os dois registradores: MAR e MDR' }),
    ).toBeVisible()
  })
})

// Em português, em todos os navegadores; em inglês (o mesmo HTML com outro texto), só no computador.
for (const idioma of ['pt-BR', 'en-US'] as const) {
  for (const tema of ['light', 'dark'] as const) {
    test.describe(`${idioma}, tema ${tema}`, () => {
      test.use({ colorScheme: tema, locale: idioma })
      for (const pagina of PAGINAS) {
        test(`/${pagina} sem problemas graves de acessibilidade`, async ({ page }, info) => {
          test.skip(
            idioma === 'en-US' && info.project.name !== 'computador',
            'inglês: só no computador',
          )
          await page.goto(`./#/documentacao/${pagina}`)
          await expect(page.locator('html')).toHaveAttribute(
            'lang',
            idioma.slice(0, 2) === 'pt' ? 'pt-BR' : 'en',
          )
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          await semProblemasGraves(page)
        })
      }
    })
  }
}
