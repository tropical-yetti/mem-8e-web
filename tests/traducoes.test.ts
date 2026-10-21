/**
 * Traduções: português e inglês têm exatamente as mesmas chaves, e nenhuma
 * mensagem está vazia.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Mensagens = { [chave: string]: string | string[] | Mensagens }

// Lidas do disco: importadas, elas passariam pelo plugin do vue-i18n e
// chegariam já compiladas, e não como texto.
function ler(idioma: string): Mensagens {
  return JSON.parse(
    readFileSync(new URL(`../src/locales/${idioma}.json`, import.meta.url), 'utf8'),
  ) as Mensagens
}
const ptBR = ler('pt-BR')
const en = ler('en')

/** Lista "a.b.c" de todas as folhas, com o tamanho das listas. */
function chaves(mensagens: Mensagens, prefixo = ''): string[] {
  return Object.entries(mensagens).flatMap(([chave, valor]) => {
    const caminho = prefixo + chave
    if (Array.isArray(valor)) return [`${caminho}[${valor.length}]`]
    return typeof valor === 'string' ? [caminho] : chaves(valor, caminho + '.')
  })
}

function textos(mensagens: Mensagens): string[] {
  return Object.values(mensagens).flatMap((valor) =>
    typeof valor === 'string' ? [valor] : Array.isArray(valor) ? valor : textos(valor),
  )
}

describe('traduções', () => {
  it('pt-BR e en têm as mesmas chaves', () => {
    expect(chaves(en).sort()).toEqual(chaves(ptBR).sort())
  })

  it.each([
    ['pt-BR', ptBR],
    ['en', en],
  ])('%s não tem mensagens vazias', (_idioma, mensagens) => {
    expect(textos(mensagens).filter((texto) => texto.trim() === '')).toEqual([])
  })
})
