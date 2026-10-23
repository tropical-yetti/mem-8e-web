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

  it('abrir um texto substitui a memória inteira', () => {
    const simulador = useSimuladorStore()
    const resultado = simulador.abrirTexto('01 02 03\nF0: XX')
    expect(resultado.ok && resultado.citadas).toBe(4)
    expect(paraNumero(simulador.celulas[2]!)).toBe(3)
    expect(paraNumero(simulador.celulas[3]!)).toBe(0)
    expect(simulador.celulas[0xf0]!.every((b) => b === 'X')).toBe(true)
  })

  it('um texto com erro não muda a memória', () => {
    const simulador = useSimuladorStore()
    const antes = simulador.celulas.map((c) => [...c])
    const resultado = simulador.abrirTexto('00: 01 02\n10: ZZ')
    expect(resultado.ok).toBe(false)
    expect(simulador.celulas).toEqual(antes)
  })

  it('o texto da memória abre de volta igual, com data e versão', () => {
    const simulador = useSimuladorStore()
    simulador.mudarCelula(0x10, 0xab)
    const texto = simulador.textoDaMemoria({ data: '2026-10-02', versao: '0.9.0' })
    expect(texto).toContain('# salvo em 2026-10-02, versão 0.9.0')
    const antes = simulador.celulas.map((c) => [...c])
    simulador.reiniciar()
    simulador.abrirTexto(texto)
    expect(simulador.celulas).toEqual(antes)
  })
})

describe('tempo', () => {
  it('sem transação, o diagrama é uma prévia da leitura do MAR', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x3a)
    expect(simulador.linhaDoTempo.tipo).toBe('ler')
    expect(simulador.linhaDoTempo.esperas).toBe(1)
    expect(simulador.instanteAtual).toBeNull()
  })

  it('o cursor acompanha a fase, e a fase de espera aparece', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarLeitura()
    expect(simulador.instanteAtual).toBe(0)
    simulador.proximaFase()
    simulador.proximaFase()
    simulador.proximaFase()
    expect(simulador.fases!.lista[simulador.fases!.indice]).toBe('espera')
    expect(simulador.instanteAtual).toBe(40)
  })

  it('sem wait states, uma memória lenta faz a leitura falhar', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMemoria('lenta')
    simulador.mudarEspera(false)
    simulador.iniciarLeitura()
    simulador.concluir()
    expect(simulador.linhaDoTempo.certo).toBe(false)
    expect(simulador.podeEscrever).toBe(false)
  })

  it('mudar o clock interrompe a transação e muda as esperas', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarEscrita()
    simulador.mudarClock(10)
    expect(simulador.fases).toBeNull()
    expect(simulador.linhaDoTempo.esperas).toBe(0)
    expect(simulador.tempo.periodo).toBe(100)
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
    // Com os tempos padrão (50 MHz, memória média) há uma fase de espera.
    expect(simulador.fases).toMatchObject({ indice: 5, terminou: true })
    expect(simulador.proximaFase()).toBe(false)
    expect(paraNumero(simulador.mdr)).toBe(CONTEUDO_INICIAL[0x3a])
  })

  it('escrita grava o MDR no endereço do MAR', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0xc4)
    simulador.mudarMdr(0x3e)
    simulador.iniciarEscrita()
    simulador.concluir()
    expect(simulador.fases).toMatchObject({ tipo: 'escrever', indice: 6, terminou: true })
    expect(paraNumero(simulador.celulas[0xc4]!)).toBe(0x3e)
  })

  it('mexer no MAR no meio de uma escrita a interrompe', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarEscrita()
    simulador.mudarMar(0x01)
    expect(simulador.fases).toBeNull()
    expect(simulador.proximaFase()).toBe(false)
  })

  it('trocar o MAR no meio de uma leitura não a interrompe (ADR 0005)', () => {
    const simulador = useSimuladorStore()
    simulador.mudarCelula(0x10, 0x11)
    simulador.mudarCelula(0x20, 0x22)
    simulador.mudarMar(0x10)
    simulador.iniciarLeitura()
    // Antes da seleção (10 ns): o novo dado ainda chega a tempo.
    simulador.mudarMar(0x20)
    expect(simulador.fases).not.toBeNull()
    expect(simulador.linhaDoTempo.mudanca).toEqual({ t: 10, endereco: '20', dado: '22' })
    simulador.concluir()
    expect(paraNumero(simulador.mdr)).toBe(0x22)
    expect(simulador.linhaDoTempo.certo).toBe(true)
  })

  it('trocar o MAR tarde demais numa leitura faz o MDR capturar X', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x10)
    simulador.iniciarLeitura()
    simulador.proximaFase() // seleção
    simulador.proximaFase() // saída: a troca conta a partir da espera (40 ns)
    simulador.mudarMar(0x20)
    expect(simulador.linhaDoTempo.mudanca?.t).toBe(40)
    simulador.concluir()
    expect(simulador.mdr.every((bit) => bit === 'X')).toBe(true)
    expect(simulador.linhaDoTempo.certo).toBe(false)
  })

  it('depois que a leitura terminou, mexer no MAR a encerra', () => {
    const simulador = useSimuladorStore()
    simulador.iniciarLeitura()
    simulador.concluir()
    simulador.mudarMar(0x01)
    expect(simulador.fases).toBeNull()
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
