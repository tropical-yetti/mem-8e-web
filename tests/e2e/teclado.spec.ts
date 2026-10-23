/**
 * Acessibilidade além do axe (issue #36): tudo só com o teclado, refluxo em
 * telas estreitas (WCAG 1.4.10) e movimento reduzido.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test, type Page } from '@playwright/test'

/** Aperta Tab até o foco chegar ao elemento, como faria quem usa só o teclado. */
async function tabAte(page: Page, alvo: ReturnType<Page['getByRole']>, limite = 60) {
  for (let i = 0; i < limite; i++) {
    if (await alvo.evaluate((el) => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('o Tab não chegou ao elemento')
}

const focado = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? ''
  })

test.describe('só com o teclado', () => {
  // O Playwright pede o objeto de fixtures vazio para chegar ao info.
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'computador', 'teclado físico: só no computador')
  })

  test('um experimento do começo ao fim, com F6 para ir e voltar', async ({ page }) => {
    await page.goto('./')
    await tabAte(page, page.getByRole('button', { name: 'Experimentos “e se…?”' }))
    await page.keyboard.press('Enter')
    // A janela abre com o foco no primeiro experimento.
    await expect(
      page.getByRole('button', { name: /^E se a CPU e a memória dirigirem o BD juntas/ }),
    ).toBeFocused()
    await page.keyboard.press('Enter')

    const balao = page.getByRole('dialog', {
      name: 'E se a CPU e a memória dirigirem o BD juntas?',
    })
    await expect(balao.getByRole('heading')).toBeFocused()
    await tabAte(page, balao.getByRole('button', { name: 'Vamos ver' }))
    await page.keyboard.press('Enter')

    // F6 leva à parte em destaque, sem percorrer a página.
    await page.keyboard.press('F6')
    await expect(page.getByRole('button', { name: 'MDR → BD' })).toBeFocused()
    await page.keyboard.press('Space')
    // O passo foi feito: o balão mostra o resultado e recebe o foco.
    await expect(balao).toContainText('O que aconteceu')
    await expect(balao.getByRole('heading')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(balao).toBeHidden()
    await expect(page.getByRole('button', { name: 'Experimentos “e se…?”' })).toBeFocused()
  })

  test('no guia, F6 vai até o MAR e volta ao balão', async ({ page }) => {
    await page.goto('./')
    await tabAte(page, page.getByRole('button', { name: 'Ver o guia' }))
    await page.keyboard.press('Enter')
    const balao = page.getByRole('dialog')
    await tabAte(page, balao.getByRole('button', { name: 'Próximo' }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'MAR: o endereço' })).toBeFocused()

    await page.keyboard.press('F6')
    await expect(page.getByRole('textbox', { name: 'MAR em hexadecimal' })).toBeFocused()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('3A')
    await page.keyboard.press('Enter')
    await page.keyboard.press('F6')
    await expect(page.getByRole('heading', { name: 'MAR: o endereço' })).toBeFocused()
    await expect(page.getByRole('textbox', { name: 'MAR em hexadecimal' })).toHaveValue('3A')
  })

  test('o botão "Ir para a parte em destaque" faz o mesmo que o F6', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Ver o guia' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: /^Ir para a parte em destaque/ }).click()
    await expect(page.getByRole('textbox', { name: 'MAR em hexadecimal' })).toBeFocused()
  })

  test('colar um texto e fechar a janela, só com o teclado', async ({ page }) => {
    await page.goto('./')
    await tabAte(page, page.getByRole('button', { name: 'Colar texto…' }))
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('textbox', { name: 'Texto com o conteúdo da memória' }),
    ).toBeFocused()
    await page.keyboard.type('00: AB')
    await tabAte(page, page.getByRole('button', { name: 'Abrir na memória' }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Colar o conteúdo da memória' })).toBeHidden()
    await expect(page.locator('td[data-endereco="00"]')).toHaveText('AB')
  })

  test('o diagrama de tempo e a documentação também se alcançam pelo Tab', async ({ page }) => {
    await page.goto('./')
    await tabAte(page, page.getByRole('region', { name: 'Diagrama de tempo' }).last(), 120)
    await page.goto('./#/documentacao/memoria')
    await tabAte(page, page.getByRole('link', { name: 'Os quatro níveis' }).first(), 80)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/níveis/i)
    expect(await focado(page)).not.toBe('')
  })
})

test.describe('refluxo: nada rola de lado em telas estreitas', () => {
  // 320 px: celular pequeno, ou zoom de 400% num monitor de 1280 px. 640 px: zoom de 200%.
  for (const largura of [320, 640]) {
    test.describe(`${largura} px`, () => {
      test.use({ viewport: { width: largura, height: 800 } })
      for (const rota of ['', '#/documentacao/memoria', '#/documentacao/tempo', '#/sobre']) {
        test(`/${rota || 'simulador'}`, async ({ page }, info) => {
          test.skip(info.project.name !== 'computador', 'a largura já é fixada aqui')
          await page.goto(`./${rota}`)
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          const { largura: vw, conteudo } = await page.evaluate(() => ({
            largura: document.documentElement.clientWidth,
            conteudo: document.documentElement.scrollWidth,
          }))
          expect(conteudo).toBeLessThanOrEqual(vw)
        })
      }
    })
  }

  test('em 320 px, o painel ainda mostra os barramentos com nome e valor', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'computador', 'a largura já é fixada aqui')
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('./')
    for (const nome of ['BE', 'BD']) {
      const rotulo = page.locator('.fio .nome', { hasText: new RegExp(`^${nome}$`) })
      await expect(rotulo).toBeVisible()
      const caixa = (await rotulo.boundingBox())!
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(320)
    }
  })
})

test.describe('movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce', storageState: { cookies: [], origins: [] } })

  test('o destaque do guia e os fios mudam sem animação', async ({ page }, info) => {
    test.skip(info.project.name !== 'computador', 'preferência do sistema, igual em todos')
    await page.goto('./')
    await page.getByRole('button', { name: 'Próximo' }).click()
    const duracoes = await page.evaluate(() =>
      ['.recorte', '.fio .linha'].map((seletor) => {
        const el = document.querySelector(seletor)!
        return Math.max(
          ...getComputedStyle(el)
            .transitionDuration.split(',')
            .map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000)),
        )
      }),
    )
    for (const d of duracoes) expect(d).toBeLessThan(1)
  })
})
