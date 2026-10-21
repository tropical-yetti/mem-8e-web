/**
 * Sinais de 4 valores: tabelas-verdade completas, inclusive com Z e X.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
  definido,
  e,
  nao,
  ou,
  paraFios,
  paraHex,
  paraNumero,
  resolver,
  resolverFios,
  todos,
  triState,
  type Nivel,
} from '@/core'

const NIVEIS: Nivel[] = [0, 1, 'Z', 'X']

describe('portas', () => {
  it('NOT', () => {
    expect(NIVEIS.map(nao)).toEqual([1, 0, 'X', 'X'])
  })

  it('AND de duas entradas', () => {
    const tabela = NIVEIS.map((a) => NIVEIS.map((b) => e(a, b)))
    expect(tabela).toEqual([
      [0, 0, 0, 0],
      [0, 1, 'X', 'X'],
      [0, 'X', 'X', 'X'],
      [0, 'X', 'X', 'X'],
    ])
  })

  it('OR de duas entradas', () => {
    const tabela = NIVEIS.map((a) => NIVEIS.map((b) => ou(a, b)))
    expect(tabela).toEqual([
      [0, 1, 'X', 'X'],
      [1, 1, 1, 1],
      ['X', 1, 'X', 'X'],
      ['X', 1, 'X', 'X'],
    ])
  })

  it('AND e OR de várias entradas', () => {
    expect(e(1, 1, 1, 1)).toBe(1)
    expect(e(1, 1, 'X', 0)).toBe(0)
    expect(ou(0, 0, 0, 0)).toBe(0)
    expect(ou(0, 'Z', 1)).toBe(1)
  })

  it('tri-state: entrada × habilitação', () => {
    const tabela = NIVEIS.map((entrada) => NIVEIS.map((habilita) => triState(entrada, habilita)))
    expect(tabela).toEqual([
      ['Z', 0, 'X', 'X'],
      ['Z', 1, 'X', 'X'],
      ['Z', 'X', 'X', 'X'],
      ['Z', 'X', 'X', 'X'],
    ])
  })

  it('definido', () => {
    expect(NIVEIS.map(definido)).toEqual([true, true, false, false])
  })
})

describe('fio com várias fontes', () => {
  it('ninguém dirigindo fica solto', () => {
    expect(resolver()).toBe('Z')
    expect(resolver('Z', 'Z')).toBe('Z')
  })

  it('uma fonte dá o valor dela', () => {
    expect(resolver('Z', 1)).toBe(1)
    expect(resolver(0, 'Z')).toBe(0)
  })

  it('fontes que concordam não brigam', () => {
    expect(resolver(1, 1)).toBe(1)
  })

  it('fontes que discordam dão contenção', () => {
    expect(resolver(0, 1)).toBe('X')
    expect(resolver('X', 'Z')).toBe('X')
    expect(resolver('X', 'X')).toBe('X')
  })

  it('resolve bit a bit, com grupos de larguras diferentes', () => {
    expect(resolverFios([0, 'Z', 1], ['Z', 1])).toEqual([0, 1, 1])
  })
})

describe('conversões', () => {
  it('número ↔ fios, para todos os bytes', () => {
    for (let valor = 0; valor < 256; valor++) {
      expect(paraNumero(paraFios(valor, 8))).toBe(valor)
    }
  })

  it('o índice é o número do bit', () => {
    expect(paraFios(0b0000_0101, 8)).toEqual([1, 0, 1, 0, 0, 0, 0, 0])
  })

  it('fios indefinidos não viram número', () => {
    expect(paraNumero([1, 'Z'])).toBeNull()
    expect(paraNumero(['X', 0])).toBeNull()
  })

  it('hexadecimal por dígito, com Z e X', () => {
    expect(paraHex(paraFios(0x3a, 8))).toBe('3A')
    expect(paraHex(todos('Z', 8))).toBe('ZZ')
    expect(paraHex([1, 0, 1, 0, 'Z', 'Z', 'Z', 'Z'])).toBe('Z5')
    expect(paraHex([1, 'X', 0, 0, 0, 0, 0, 0])).toBe('0X')
    expect(paraHex([1, 'Z', 0, 0, 0, 0, 0, 0])).toBe('0X')
  })
})
