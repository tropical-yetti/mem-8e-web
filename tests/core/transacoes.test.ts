/**
 * Transações e barramentos. A referência é um modelo trivial, um array de
 * 256 bytes: depois de cada transação, o resultado e a memória inteira
 * precisam bater com ele (validação por transação e estado da memória).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
  BD_SOLTO,
  capturarMdr,
  carregarPrograma,
  criarSistema,
  definirMar,
  definirMdr,
  escrever,
  executar,
  FASES_ESCRITA,
  FASES_LEITURA,
  ler,
  paraFios,
  paraNumero,
  propagar,
  TAMANHO,
  todos,
  valorDe,
  type Sistema,
} from '@/core'

function estadoDaMemoria(sistema: Sistema): (number | null)[] {
  return Array.from({ length: TAMANHO }, (_, endereco) => valorDe(sistema.memoria, endereco))
}

/** Gerador de números pseudoaleatórios com semente, para os testes se repetirem. */
function sorteador(semente: number): () => number {
  let x = semente
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    return x >> 8
  }
}

describe('estado antes e depois, contra um array de 256 bytes', () => {
  it('escrever(a, v) e depois ler(a) devolve v, para todos os endereços', () => {
    const sistema = criarSistema()
    const referencia = new Array<number>(TAMANHO).fill(0)
    for (let endereco = 0; endereco < TAMANHO; endereco++) {
      const valor = (endereco * 37 + 11) & 0xff
      executar(escrever(sistema, endereco, valor))
      referencia[endereco] = valor
      expect(executar(ler(sistema, endereco)).resultado).toBe(valor)
      expect(estadoDaMemoria(sistema)).toEqual(referencia)
    }
  })

  it('uma sequência aleatória de leituras e escritas mantém memória e modelo iguais', () => {
    const sortear = sorteador(2026)
    const sistema = criarSistema()
    const programa = Uint8Array.from({ length: TAMANHO }, () => sortear() & 0xff)
    carregarPrograma(sistema.memoria, programa)
    const referencia = [...programa]
    for (let i = 0; i < 400; i++) {
      const endereco = sortear() & 0xff
      if (sortear() & 1) {
        const valor = sortear() & 0xff
        executar(escrever(sistema, endereco, valor))
        referencia[endereco] = valor
      } else {
        expect(executar(ler(sistema, endereco)).resultado).toBe(referencia[endereco])
      }
    }
    expect(estadoDaMemoria(sistema)).toEqual(referencia)
  })

  it('ler não muda a memória', () => {
    const sistema = criarSistema()
    carregarPrograma(
      sistema.memoria,
      Uint8Array.from({ length: 256 }, (_, i) => 255 - i),
    )
    const antes = estadoDaMemoria(sistema)
    for (let endereco = 0; endereco < TAMANHO; endereco++) executar(ler(sistema, endereco))
    expect(estadoDaMemoria(sistema)).toEqual(antes)
  })
})

describe('fases da leitura', () => {
  const sistema = criarSistema()
  carregarPrograma(sistema.memoria, Uint8Array.of(0, 0, 0, 0x5a))
  const { passos } = executar(ler(sistema, 0x03))

  it('seguem a ordem das fases', () => {
    expect(passos.map((p) => p.fase)).toEqual(FASES_LEITURA)
  })

  it('o BE tem o endereço desde a primeira fase', () => {
    passos.forEach((p) => expect(p.avaliacao.be).toEqual(paraFios(0x03, 8)))
  })

  it('o BD só tem o dado enquanto RD está ligado', () => {
    expect(passos.map((p) => paraNumero(p.avaliacao.bd))).toEqual([null, null, 0x5a, 0x5a, null])
    expect(passos[0]!.avaliacao.bd).toEqual(BD_SOLTO)
    expect(passos[4]!.avaliacao.bd).toEqual(BD_SOLTO)
  })

  it('os sinais de controle mudam na ordem certa', () => {
    expect(passos.map((p) => [p.cs, p.rd, p.wr])).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ])
  })

  it('a linha e a coluna só são escolhidas com CS', () => {
    expect(passos[0]!.avaliacao.interno.linhas.includes(1)).toBe(false)
    expect(passos[1]!.avaliacao.interno.linhas[0]).toBe(1)
    expect(passos[1]!.avaliacao.interno.colunas[3]).toBe(1)
  })

  it('o MDR fica com o dado a partir da captura', () => {
    expect(paraNumero(passos[2]!.mdr)).toBe(0)
    expect(paraNumero(passos[3]!.mdr)).toBe(0x5a)
    expect(paraNumero(sistema.mdr)).toBe(0x5a)
  })
})

describe('fases da escrita', () => {
  const sistema = criarSistema()
  const { passos } = executar(escrever(sistema, 0xc4, 0x3e))

  it('seguem a ordem das fases', () => {
    expect(passos.map((p) => p.fase)).toEqual(FASES_ESCRITA)
  })

  it('a CPU dirige o BD da fase "dado" até soltar no fim', () => {
    expect(passos.map((p) => paraNumero(p.avaliacao.bd))).toEqual([
      null,
      0x3e,
      0x3e,
      0x3e,
      0x3e,
      null,
    ])
    expect(passos.every((p) => !p.avaliacao.contencao)).toBe(true)
  })

  it('a célula só muda com WR ligado', () => {
    expect(passos.map((p) => p.avaliacao.escritos)).toEqual([[], [], [], [0xc4], [], []])
    expect(passos.map((p) => p.avaliacao.interno.linhasDeBit[4]!)).toEqual([
      todos(0, 8),
      todos(0, 8),
      todos(0, 8),
      paraFios(0x3e, 8),
      paraFios(0x3e, 8),
      todos(0, 8),
    ])
  })
})

describe('experimentos "e se…?" com os sinais na mão', () => {
  function sistemaCom(endereco: number, valor: number): Sistema {
    const sistema = criarSistema()
    definirMar(sistema, endereco)
    executar(escrever(sistema, endereco, valor))
    return sistema
  }

  it('ninguém dirigindo: o BD fica solto', () => {
    const sistema = criarSistema()
    expect(propagar(sistema).bd).toEqual(BD_SOLTO)
  })

  it('CPU e memória dirigindo juntas: contenção nos bits em que discordam', () => {
    const sistema = sistemaCom(0x10, 0b1111_0000)
    definirMdr(sistema, 0b1010_1010)
    sistema.cpuDirigeDados = 1
    sistema.cs = 1
    sistema.rd = 1
    const avaliacao = propagar(sistema)
    expect(avaliacao.contencao).toBe(true)
    expect(avaliacao.bd).toEqual([0, 'X', 0, 'X', 'X', 1, 'X', 1])
  })

  it('RD e WR juntos sem a CPU no BD: a memória reescreve o próprio valor', () => {
    const sistema = sistemaCom(0x20, 0x99)
    sistema.cs = 1
    sistema.rd = 1
    sistema.wr = 1
    const avaliacao = propagar(sistema)
    expect(avaliacao.escritos).toEqual([0x20])
    expect(valorDe(sistema.memoria, 0x20)).toBe(0x99)
  })

  it('RD e WR juntos com a CPU no BD: a célula fica indefinida onde houve briga', () => {
    const sistema = sistemaCom(0x20, 0b0000_1111)
    definirMdr(sistema, 0b0000_0011)
    sistema.cpuDirigeDados = 1
    sistema.cs = 1
    sistema.rd = 1
    sistema.wr = 1
    const avaliacao = propagar(sistema)
    expect(avaliacao.contencao).toBe(true)
    expect(sistema.memoria.celulas[0x20]).toEqual([1, 1, 'X', 'X', 0, 0, 0, 0])
    expect(avaliacao.interno.saida.slice(0, 4)).toEqual([1, 1, 'X', 'X'])
  })

  it('escrever sem a CPU dirigir o BD estraga a célula', () => {
    const sistema = sistemaCom(0x30, 0x12)
    sistema.cs = 1
    sistema.wr = 1
    propagar(sistema)
    expect(valorDe(sistema.memoria, 0x30)).toBeNull()
  })

  it('capturar o BD solto deixa o MDR indefinido', () => {
    const sistema = criarSistema()
    capturarMdr(sistema, BD_SOLTO)
    expect(sistema.mdr).toEqual(todos('X', 8))
    expect(executar(ler(sistema, 0)).resultado).toBe(0)
  })

  it('ler uma célula indefinida devolve null', () => {
    const sistema = sistemaCom(0x40, 0)
    sistema.memoria.celulas[0x40]![0] = 'X'
    expect(executar(ler(sistema, 0x40)).resultado).toBeNull()
  })

  it('MAR e MDR guardam só 8 bits', () => {
    const sistema = criarSistema()
    definirMar(sistema, 0x1ff)
    definirMdr(sistema, 0x1ab)
    expect(sistema.mar).toBe(0xff)
    expect(paraNumero(sistema.mdr)).toBe(0xab)
  })
})
