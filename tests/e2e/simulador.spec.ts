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

test.describe('vista por dentro', () => {
  test('mostra os decodificadores, a linha de bits, o seletor e os buffers', async ({ page }) => {
    await porNoMar(page, '3A')
    await expect(page.getByText('A3–A0 = 1010 (A)')).toBeVisible()
    await page.getByRole('button', { name: /^CS/ }).click()
    await expect(page.getByText(`saída: ${M3A}`)).toBeVisible()
    await expect(page.getByText('desligados: saída em Z')).toBeVisible()
    await page.getByRole('button', { name: /^RD/ }).click()
    await expect(page.getByText(`ligados: ${M3A} vai para o BD`)).toBeVisible()
    await expect(page.getByText(`D7–D0 → BD = ${M3A}`)).toBeVisible()
  })

  test('a escolha da vista é lembrada', async ({ page }) => {
    await page.getByRole('radio', { name: 'Só o conteúdo' }).click()
    await expect(page.getByText('Seletor de coluna 16 → 1')).toBeHidden()
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Só o conteúdo' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.getByRole('radio', { name: 'Por dentro' }).click()
    await expect(page.getByText('Seletor de coluna 16 → 1')).toBeVisible()
  })
})

test.describe('em portas lógicas', () => {
  test('o decodificador de linha mostra a porta do endereço em 1', async ({ page }) => {
    await porNoMar(page, '3A')
    await page.getByRole('button', { name: /^CS/ }).click()
    await page.getByRole('tab', { name: 'Decodificador de linha' }).click()
    await expect(
      page.getByRole('img', { name: /entradas 0011, EN = 1\. Saída de linha em 1: 3\./ }),
    ).toBeVisible()
    await page.getByRole('tab', { name: 'Decodificador de linha' }).press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Decodificador de coluna' })).toBeFocused()
    await expect(
      page.getByRole('img', { name: /entradas 1010, EN = 1\. Saída de coluna em 1: A\./ }),
    ).toBeVisible()
  })

  test('o bit da célula acompanha a escrita', async ({ page }) => {
    await porNoMar(page, '00')
    const mdr = page.getByRole('textbox', { name: 'MDR em hexadecimal' })
    await mdr.fill('01')
    await mdr.press('Enter')
    await page.getByRole('button', { name: 'D0', exact: true }).click()
    await page.getByRole('button', { name: /^Escrever/ }).click()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próxima fase' }).click()
    await expect(
      page.getByRole('img', {
        name: /Bit 0 do endereço 00 .*guarda 1; escrita liberada = 1; saída para o BD = Z/,
      }),
    ).toBeVisible()
  })
})

test.describe('diagrama de tempo', () => {
  test('com os tempos padrão, a leitura tem um wait state e dá certo', async ({ page }) => {
    await expect(page.getByText(/Com 1 wait state, o ciclo de leitura leva 80 ns/)).toBeVisible()
    await page.getByRole('button', { name: /^Ler o endereço/ }).click()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próxima fase' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Wait state' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    await page.getByRole('button', { name: 'Ir até o fim' }).click()
    await expect(page.getByText(/^Leitura concluída/)).toBeVisible()
  })

  test('sem wait states, uma memória lenta faz a leitura dar errado', async ({ page }) => {
    await page.getByLabel('Memória', { exact: true }).selectOption('lenta')
    await page.getByRole('checkbox', { name: 'A CPU espera a memória (wait states)' }).uncheck()
    await expect(page.getByText(/^Leitura errada: a CPU captura em 40 ns/)).toBeVisible()
    await page.getByRole('button', { name: /^Ler o endereço/ }).click()
    await page.getByRole('button', { name: 'Ir até o fim' }).click()
    await expect(page.getByText(/não chegou ao MDR a tempo \(MDR = XX\)/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Escrever/ })).toBeDisabled()
  })

  test('clock mais rápido, mais wait states na escrita', async ({ page }) => {
    await page.getByLabel('Clock da CPU', { exact: true }).selectOption('100')
    await page.getByRole('button', { name: /^Escrever/ }).click()
    await expect(page.getByText(/com 3 wait states, o pulso dura 40 ns/)).toBeVisible()
  })
})

test.describe('legendas das siglas', () => {
  test('apontar para o fio BE mostra o nome do barramento', async ({ page }) => {
    await page.locator('[data-sigla="be"]').first().hover()
    const legenda = page.getByRole('tooltip')
    await expect(legenda).toBeVisible()
    await expect(legenda).toContainText('Barramento de endereços')
    await page.mouse.move(0, 0)
    await expect(legenda).toBeHidden()
  })

  test('com o teclado: o foco no CS mostra a legenda, que vira a descrição do botão', async ({
    page,
  }) => {
    const cs = page.getByRole('button', { name: /^CS/ })
    await cs.focus()
    await expect(page.getByRole('tooltip')).toContainText('Chip select')
    await expect(cs).toHaveAttribute('aria-describedby', /legenda-sigla/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toBeHidden()
    await expect(cs).not.toHaveAttribute('aria-describedby', /legenda-sigla/)
  })

  test('MAR e MDR também têm legenda', async ({ page }) => {
    await page.getByText('MAR', { exact: true }).hover()
    await expect(page.getByRole('tooltip')).toContainText('Memory Address Register')
    await page.getByText('MDR', { exact: true }).first().hover()
    await expect(page.getByRole('tooltip')).toContainText('MBR (Memory Buffer Register)')
  })
})

test('o rodapé mostra a versão', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toContainText(/Versão \d+\.\d+\.\d+/)
})
