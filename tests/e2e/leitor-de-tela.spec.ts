/**
 * Leitor de tela simulado (issue #36): o que seria dito na grade, nos
 * experimentos e nas mensagens. Ninguém no projeto usa leitor de tela no dia
 * a dia, então isto é o que dá para garantir no CI; o teste com leitores
 * reais continua pendente.
 *
 * O leitor virtual monta as frases a partir do DOM, e não da árvore de
 * acessibilidade de cada navegador, então basta rodar num projeto.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expect, test, type Page } from '@playwright/test'
import { frases, lerTudo, ligarLeitor, limparFrases } from './leitor-virtual'

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'computador', 'o leitor virtual não depende do navegador')
  await page.goto('./')
})

/** Conteúdo inicial de um endereço (veja CONTEUDO_INICIAL na store), com os dígitos separados. */
const falado = (endereco: number) =>
  [...((endereco * 0x9d + 0x37) & 0xff).toString(16).toUpperCase().padStart(2, '0')].join(' ')

/** O conteúdo inicial como aparece na tela. */
const visivel = (endereco: number) =>
  ((endereco * 0x9d + 0x37) & 0xff).toString(16).toUpperCase().padStart(2, '0')

const celula = (page: Page, endereco: string) => page.locator(`td[data-endereco="${endereco}"]`)

async function lerAPagina(page: Page) {
  await ligarLeitor(page)
  return lerTudo(page)
}

test.describe('a memória nunca é lida célula a célula', () => {
  for (const vista of ['Por dentro', 'Só o conteúdo']) {
    test(`ler a página inteira passa por uma célula só (${vista})`, async ({ page }) => {
      await page.getByRole('radio', { name: vista }).click()
      const lidas = await lerAPagina(page)
      const celulas = lidas.filter((f) => f.startsWith('gridcell'))
      expect(celulas).toEqual([
        `gridcell, Linha 0, coluna 0: ${visivel(0)}, valor hexadecimal ${falado(0)}, endereço do MAR, column index 1, current location`,
      ])
      expect(lidas).toContain('end of document')
    })
  }

  test('desenhos são lidos pela descrição, e não por dentro', async ({ page }) => {
    const lidas = await lerAPagina(page)
    const imagens = lidas.flatMap((f, i) => (f.startsWith('image, ') ? [i] : []))
    expect(imagens.length).toBeGreaterThanOrEqual(2)
    // Logo depois da descrição vem o fim de algum bloco: nada de dentro do desenho é lido.
    for (const i of imagens) expect(lidas[i + 1]).toMatch(/^end of /)
    expect(lidas).not.toContain('group')
  })

  test('as seções não levam o "?" do botão de ajuda no nome', async ({ page }) => {
    const lidas = await lerAPagina(page)
    const nomes = lidas.filter((f) => /^(region|grid), /.test(f))
    expect(nomes.length).toBeGreaterThan(3)
    for (const nome of nomes) expect(nome).not.toMatch(/ \?(,|$)/)
  })
})

test.describe('navegar na grade', () => {
  test('cada seta anuncia só a nova célula: linha, coluna e dígitos separados', async ({
    page,
  }) => {
    await celula(page, '00').click()
    await ligarLeitor(page)
    const passos: [string, number, string][] = [
      ['ArrowRight', 0x01, 'Linha 0, coluna 1'],
      ['ArrowDown', 0x11, 'Linha 1, coluna 1'],
      ['End', 0x1f, 'Linha 1, coluna F'],
      ['ArrowDown', 0x2f, 'Linha 2, coluna F'],
    ]
    for (const [tecla, endereco, onde] of passos) {
      await limparFrases(page)
      await page.keyboard.press(tecla)
      await expect
        .poll(() => frases(page))
        .toEqual([
          `gridcell, ${onde}: ${visivel(endereco)}, valor hexadecimal ${falado(endereco)}, column index ${(endereco % 16) + 1}`,
        ])
    }
  })

  test('células indefinidas dizem quais bits', async ({ page }) => {
    await page.getByRole('button', { name: 'Colar texto…' }).click()
    await page.getByRole('textbox', { name: 'Texto com o conteúdo da memória' }).fill('XX 1X0X0001')
    await page.getByRole('button', { name: 'Abrir na memória' }).click()
    await celula(page, '00').click()
    await ligarLeitor(page)
    await expect(page.getByRole('gridcell')).toHaveAccessibleName(
      'Linha 0, coluna 0: XX, valor indefinido, endereço do MAR',
    )
    await limparFrases(page)
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(() => frases(page))
      .toEqual([
        'gridcell, Linha 0, coluna 1: X1, valor com bits indefinidos, do bit 7 ao 0: 1 X 0 X 0 0 0 1, column index 2',
      ])
  })

  test('o resumo da vista "por dentro" diz a linha, a coluna e os buffers', async ({ page }) => {
    await page.getByRole('textbox', { name: 'MAR em hexadecimal' }).fill('3A')
    await page.getByRole('textbox', { name: 'MAR em hexadecimal' }).press('Enter')
    await page.getByRole('button', { name: /^CS/ }).click()
    await page.getByRole('button', { name: /^RD/ }).click()
    await expect(page.getByRole('grid')).toHaveAccessibleDescription(
      /CS ligado: o decodificador de linha escolhe a linha 3, e o de coluna, a coluna A\. Os buffers de saída estão ligados e põem [0-9A-F] [0-9A-F] no BD\./,
    )
  })
})

test.describe('o que muda é anunciado', () => {
  test('o resultado de um experimento', async ({ page }) => {
    await page.getByRole('button', { name: 'Experimentos “e se…?”' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^E se a CPU e a memória/ })
      .click()
    await page.getByRole('button', { name: 'Vamos ver' }).click()
    await ligarLeitor(page)
    await page.getByRole('button', { name: 'MDR → BD' }).click()
    await expect
      .poll(() => frases(page))
      .toContainEqual(expect.stringMatching(/^polite: O BD mostra XX: em binário, 0XX1 1XX0\./))
  })

  test('as mensagens de colar: o erro com urgência, o sucesso com calma', async ({ page }) => {
    await ligarLeitor(page)
    await page.getByRole('button', { name: 'Colar texto…' }).click()
    const campo = page.getByRole('textbox', { name: 'Texto com o conteúdo da memória' })
    await campo.fill('00: G1')
    await page.getByRole('button', { name: 'Abrir na memória' }).click()
    await expect
      .poll(() => frases(page))
      .toContainEqual(expect.stringMatching(/^assertive: Linha 1, coluna 5: “G1” não é um byte\./))
    await limparFrases(page)
    await campo.fill('00: 11')
    await page.getByRole('button', { name: 'Abrir na memória' }).click()
    await expect
      .poll(() => frases(page))
      .toContain('polite: 1 posição veio do texto; as outras ficaram em 00.')
  })
})

test.describe('árvore de acessibilidade', () => {
  test('a grade expõe uma célula só, e o resumo da vista "por dentro"', async ({ page }) => {
    await expect(page.locator('[data-guia="grade"]')).toMatchAriaSnapshot(`
      - region "Memória por dentro (linha × coluna)":
        - heading "Memória por dentro (linha × coluna)" [level=2]:
          - 'button "Ajuda: A memória por dentro"'
        - radiogroup "Como mostrar a memória":
          - radio "Por dentro" [checked]
          - radio "Só o conteúdo"
        - paragraph
        - grid "Memória por dentro (linha × coluna)":
          - rowgroup:
            - row:
              - 'gridcell "Linha 0, coluna 0: 37, valor hexadecimal 3 7, endereço do MAR"'
        - paragraph: "CS desligado: os decodificadores não escolhem nenhuma linha nem coluna, e os buffers de saída estão desligados."
    `)
  })

  test('o painel: registradores, bits e sinais, sem rótulos repetidos', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'CPU, barramentos e memória' }))
      .toMatchAriaSnapshot(`
      - region "CPU, barramentos e memória":
        - heading "CPU" [level=2]
        - heading "Memória 256 × 8" [level=2]
        - text: MAR
        - textbox "MAR em hexadecimal": "00"
        - group "Bits do MAR"
        - text: MDR
        - textbox "MDR em hexadecimal": "00"
        - group "Bits do MDR"
        - button "MDR → BD"
        - button "CS liga a memória"
        - button "RD leitura"
        - button "WR escrita"
        - status: "BE = 00. BD: solto, ninguém dirigindo. CS = 0, RD = 0, WR = 0."
    `)
  })

  test('as seções têm o nome do título, sem o botão de ajuda', async ({ page }) => {
    for (const nome of ['Transação passo a passo', 'Em portas lógicas', 'Diagrama de tempo']) {
      // (O diagrama de tempo tem, dentro da seção, a moldura rolável com o mesmo nome.)
      await expect(page.getByRole('region', { name: nome, exact: true }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: nome, exact: true })).toBeVisible()
    }
  })
})
