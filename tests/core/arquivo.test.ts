/**
 * Conteúdo da memória em texto (ADR 0006).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
  criarMemoria,
  editarCelula,
  escreverByte,
  escreverTexto,
  lerByte,
  lerTexto,
  paraFios,
  TAMANHO,
  todos,
  type Nivel,
} from '@/core'

function ok(texto: string) {
  const resultado = lerTexto(texto)
  if (!resultado.ok) throw new Error(`erro inesperado: ${JSON.stringify(resultado.erro)}`)
  return resultado
}

function erro(texto: string) {
  const resultado = lerTexto(texto)
  if (resultado.ok) throw new Error('era para dar erro')
  return resultado.erro
}

describe('lerByte e escreverByte', () => {
  it('lê hex de 2 dígitos, em maiúsculas ou minúsculas', () => {
    expect(lerByte('3A')).toEqual(paraFios(0x3a, 8))
    expect(lerByte('ff')).toEqual(paraFios(0xff, 8))
  })

  it('lê XX como 8 bits indefinidos', () => {
    expect(lerByte('XX')).toEqual(todos('X', 8))
    expect(lerByte('xx')).toEqual(todos('X', 8))
  })

  it('lê 8 dígitos do bit 7 ao bit 0', () => {
    // 1X0X0001: bit 7 = 1, bit 6 = X, bit 4 = X, bit 0 = 1.
    expect(lerByte('1X0X0001')).toEqual([1, 0, 0, 0, 'X', 0, 'X', 1])
  })

  it('recusa o que não é byte', () => {
    for (const trecho of ['3', '3AB', 'G0', 'Z0', '1010101', '10Z01010', 'X0']) {
      expect(lerByte(trecho)).toBeNull()
    }
  })

  it('escreve hex, XX ou bits, e volta ao mesmo valor', () => {
    const casos: [Nivel[], string][] = [
      [paraFios(0x0a, 8), '0A'],
      [todos('X', 8), 'XX'],
      [[1, 0, 0, 0, 'X', 0, 'X', 1], '1X0X0001'],
    ]
    for (const [celula, texto] of casos) {
      expect(escreverByte(celula)).toBe(texto)
      expect(lerByte(texto)).toEqual(celula)
    }
  })
})

describe('lerTexto', () => {
  it('lê linhas com endereço e deixa o resto em 00', () => {
    const r = ok('10: 01 02\nF0: FF\n')
    expect(r.citadas).toBe(3)
    expect(r.celulas[0x10]).toEqual(paraFios(1, 8))
    expect(r.celulas[0x11]).toEqual(paraFios(2, 8))
    expect(r.celulas[0xf0]).toEqual(paraFios(0xff, 8))
    expect(r.celulas[0x00]).toEqual(paraFios(0, 8))
    expect(r.celulas[0x12]).toEqual(paraFios(0, 8))
    expect(r.celulas).toHaveLength(TAMANHO)
  })

  it('sem endereço, começa em 00 e continua de onde parou', () => {
    const r = ok('01 02\n03\n20: AA\nBB')
    expect(r.celulas.slice(0, 3)).toEqual([1, 2, 3].map((v) => paraFios(v, 8)))
    expect(r.celulas[0x20]).toEqual(paraFios(0xaa, 8))
    expect(r.celulas[0x21]).toEqual(paraFios(0xbb, 8))
  })

  it('ignora comentários, linhas vazias, espaços e quebras de linha do Windows', () => {
    const r = ok('# título: com dois-pontos\r\n\r\n  05 :  0A 0B ; fim\r\n\t; só comentário\r\n')
    expect(r.citadas).toBe(2)
    expect(r.celulas[5]).toEqual(paraFios(0x0a, 8))
    expect(r.celulas[6]).toEqual(paraFios(0x0b, 8))
  })

  it('aceita uma linha só com endereço', () => {
    const r = ok('40:\n01')
    expect(r.citadas).toBe(1)
    expect(r.celulas[0x40]).toEqual(paraFios(1, 8))
  })

  it('aceita texto vazio: memória toda em 00', () => {
    const r = ok('')
    expect(r.citadas).toBe(0)
    expect(r.celulas.every((c) => c.every((b) => b === 0))).toBe(true)
  })

  it('aceita a última posição, FF', () => {
    expect(ok('FF: 7E').celulas[0xff]).toEqual(paraFios(0x7e, 8))
  })

  it('aponta um byte inválido com linha e coluna', () => {
    expect(erro('00: 01 02\n10: 03 G4 05')).toEqual({
      tipo: 'byteInvalido',
      linha: 2,
      coluna: 8,
      trecho: 'G4',
    })
  })

  it('aponta um endereço que não é hex', () => {
    expect(erro('01\n  1G: 02')).toEqual({
      tipo: 'enderecoInvalido',
      linha: 2,
      coluna: 3,
      trecho: '1G:',
    })
    expect(erro(': 02').tipo).toBe('enderecoInvalido')
  })

  it('recusa um endereço depois de FF', () => {
    expect(erro('100: 01')).toEqual({ tipo: 'foraDaMemoria', linha: 1, coluna: 1, trecho: '100:' })
  })

  it('recusa bytes que passariam de FF', () => {
    expect(erro('FF: 01 02')).toEqual({ tipo: 'foraDaMemoria', linha: 1, coluna: 8, trecho: '02' })
  })

  it('recusa a mesma posição duas vezes', () => {
    expect(erro('10: 01 02\n11: 03')).toEqual({
      tipo: 'repetido',
      linha: 2,
      coluna: 5,
      trecho: '03',
      endereco: 0x11,
    })
  })
})

describe('escreverTexto', () => {
  it('escreve 16 linhas de 16 bytes, com endereço e cabeçalho', () => {
    const memoria = criarMemoria()
    editarCelula(memoria, 0x00, 0x3a)
    editarCelula(memoria, 0xff, 0x01)
    const texto = escreverTexto(memoria, { data: '2026-10-22', versao: '0.9.0' })
    const linhas = texto.trimEnd().split('\n')
    expect(linhas[0]).toBe('# MEM-8E Web: conteúdo da memória (256 × 8)')
    expect(linhas[1]).toBe('# salvo em 2026-10-22, versão 0.9.0')
    expect(linhas[3]).toBe('00: 3A 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00')
    expect(linhas.at(-1)).toBe('F0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01')
    expect(linhas.filter((l) => /^[0-9A-F]{2}: /.test(l))).toHaveLength(16)
    expect(texto.endsWith('\n')).toBe(true)
  })

  it('sem cabeçalho, escreve só o título', () => {
    const linhas = escreverTexto(criarMemoria()).split('\n')
    expect(linhas[1]).toBe('')
    expect(linhas[2]).toMatch(/^00: /)
  })

  it('salvar e abrir de volta dá a mesma memória, inclusive com X', () => {
    const memoria = criarMemoria()
    for (let a = 0; a < TAMANHO; a++) editarCelula(memoria, a, (a * 37 + 11) & 0xff)
    memoria.celulas[0x42] = todos('X', 8)
    memoria.celulas[0x43] = [1, 'X', 0, 1, 0, 0, 'X', 0]
    const r = ok(escreverTexto(memoria, { data: '2026-10-22', versao: '0.9.0' }))
    expect(r.citadas).toBe(TAMANHO)
    expect(r.celulas).toEqual(memoria.celulas)
  })
})
