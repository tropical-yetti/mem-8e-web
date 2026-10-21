/**
 * Store do simulador: edições à mão, transações passo a passo e a regra de
 * que mexer no MAR, no MDR ou nos sinais interrompe a transação.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { paraNumero, TAMANHO } from '@/core'
import { CONTEUDO_INICIAL, useSimuladorStore } from '@/stores/simulador'

beforeEach(() => setActivePinia(createPinia()))

describe('conteúdo inicial', () => {
  it('cada posição tem um valor diferente', () => {
    expect(new Set(CONTEUDO_INICIAL).size).toBe(TAMANHO)
    const simulador = useSimuladorStore()
    expect(paraNumero(simulador.celulas[0x3a]!)).toBe(CONTEUDO_INICIAL[0x3a])
  })
})

describe('edições à mão', () => {
  it('MAR por valor e por bit', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x3a)
    expect(simulador.mar).toBe(0x3a)
    simulador.alternarBitMar(7)
    expect(simulador.mar).toBe(0xba)
    expect(paraNumero(simulador.avaliacao.be)).toBe(0xba)
  })

  it('MDR por valor e por bit, inclusive um bit indefinido', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMdr(0x0f)
    simulador.alternarBitMdr(0)
    expect(paraNumero(simulador.mdr)).toBe(0x0e)
    simulador.alternarBitMdr(0)
    expect(paraNumero(simulador.mdr)).toBe(0x0f)
  })

  it('sinais ligam e desligam, e o BD acompanha', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x10)
    simulador.alternarSinal('cs')
    simulador.alternarSinal('rd')
    expect(paraNumero(simulador.avaliacao.bd)).toBe(CONTEUDO_INICIAL[0x10])
    simulador.alternarSinal('rd')
    expect(simulador.sinais.rd).toBe(0)
    expect(simulador.avaliacao.bd.every((bit) => bit === 'Z')).toBe(true)
  })

  it('editar uma posição muda a célula e a avaliação', () => {
    const simulador = useSimuladorStore()
    simulador.mudarCelula(0x00, 0xab)
    expect(paraNumero(simulador.celulas[0]!)).toBe(0xab)
  })

  it('reiniciar zera memória, registradores e sinais', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x44)
    simulador.alternarSinal('cs')
    simulador.reiniciar()
    expect(simulador.mar).toBe(0)
    expect(simulador.sinais.cs).toBe(0)
    expect(simulador.celulas.every((c) => paraNumero(c) === 0)).toBe(true)
  })

  it('carregar um programa devolve o tamanho', () => {
    const simulador = useSimuladorStore()
    expect(simulador.carregar(Uint8Array.of(1, 2, 3))).toBe(3)
    expect(paraNumero(simulador.celulas[2]!)).toBe(3)
    expect(paraNumero(simulador.celulas[3]!)).toBe(0)
  })
})

describe('transações passo a passo', () => {
  it('leitura: uma fase por vez, até o fim', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x3a)
    simulador.iniciarLeitura()
    expect(simulador.fases).toMatchObject({ tipo: 'ler', indice: 0, terminou: false })
    expect(simulador.proximaFase()).toBe(true)
    expect(simulador.fases!.indice).toBe(1)
    simulador.concluir()
    expect(simulador.fases).toMatchObject({ indice: 4, terminou: true })
    expect(simulador.proximaFase()).toBe(false)
    expect(paraNumero(simulador.mdr)).toBe(CONTEUDO_INICIAL[0x3a])
  })

  it('escrita grava o MDR no endereço do MAR', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0xc4)
    simulador.mudarMdr(0x3e)
    simulador.iniciarEscrita()
    simulador.concluir()
    expect(simulador.fases).toMatchObject({ tipo: 'escrever', indice: 5, terminou: true })
    expect(paraNumero(simulador.celulas[0xc4]!)).toBe(0x3e)
  })

  it('mexer no MAR no meio da transação a interrompe', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarLeitura()
    simulador.mudarMar(0x01)
    expect(simulador.fases).toBeNull()
    expect(simulador.proximaFase()).toBe(false)
  })

  it('editar a memória no meio da transação não a interrompe', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarLeitura()
    simulador.mudarCelula(0x00, 0x99)
    simulador.concluir()
    expect(paraNumero(simulador.mdr)).toBe(0x99)
  })

  it('encerrar descarta a transação', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarEscrita()
    simulador.encerrar()
    expect(simulador.fases).toBeNull()
  })

  it('só dá para escrever com o MDR definido', () => {
    const simulador = useSimuladorStore()
    expect(simulador.podeEscrever).toBe(true)
    // CS e WR sem a CPU dirigir o BD: a célula captura o barramento solto.
    simulador.mudarMar(0x05)
    simulador.alternarSinal('cs')
    simulador.alternarSinal('wr')
    simulador.alternarSinal('wr')
    simulador.alternarSinal('cs')
    expect(paraNumero(simulador.celulas[0x05]!)).toBeNull()
    // Ler essa célula deixa o MDR indefinido.
    simulador.iniciarLeitura()
    simulador.concluir()
    expect(simulador.podeEscrever).toBe(false)
  })
})
