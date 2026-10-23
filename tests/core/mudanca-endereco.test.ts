/**
 * Endereço trocado no meio de uma leitura (ADR 0005).
 *
 * Tempos padrão: clock de 50 MHz (P = 20 ns) e memória média (t_AA = 45 ns,
 * t_OE = 20 ns). O dado fica válido em 45 ns, e a CPU captura em 60 ns, com 1
 * wait state. As fases ficam em: seleção 10 ns, saída 20 ns, espera 40 ns,
 * captura 60 ns, liberação 70 ns.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
  capturaEm,
  carregarPrograma,
  criarSistema,
  dadoValidoEm,
  instantesLeitura,
  leituraCerta,
  ler,
  linhaDoTempoLeitura,
  MEMORIAS,
  paraNumero,
  periodoDe,
  TEMPO_PADRAO,
  type FaseLeitura,
  type ParametrosTempo,
} from '@/core'

function sistemaCom(bytes: Record<number, number>) {
  const sistema = criarSistema()
  const conteudo = new Uint8Array(256)
  for (const [endereco, valor] of Object.entries(bytes)) conteudo[Number(endereco)] = valor
  carregarPrograma(sistema.memoria, conteudo)
  return sistema
}

/** Lê `de`, trocando o MAR para `para` logo antes da fase `antesDe`. */
function lerTrocando(de: number, para: number, antesDe: FaseLeitura, tempo?: ParametrosTempo) {
  const sistema = sistemaCom({ [de]: 0x11, [para]: 0x22 })
  const gerador = ler(sistema, de, tempo)
  const fases: string[] = []
  let passo = gerador.next()
  while (!passo.done) {
    fases.push(passo.value.fase)
    const lista = tempo
      ? ['endereco', 'selecao', 'saida', 'espera', 'captura', 'liberacao']
      : ['endereco', 'selecao', 'saida', 'captura', 'liberacao']
    const proxima = lista[lista.indexOf(passo.value.fase) + 1]
    if (proxima === antesDe) sistema.mar = para
    passo = gerador.next()
  }
  return { sistema, resultado: passo.value, fases }
}

describe('tempo com troca de endereço', () => {
  it('a contagem de t_AA recomeça na troca', () => {
    expect(dadoValidoEm(TEMPO_PADRAO)).toBe(45)
    expect(dadoValidoEm(TEMPO_PADRAO, 10)).toBe(55)
    expect(dadoValidoEm(TEMPO_PADRAO, 20)).toBe(65)
  })

  it('a leitura dá certo só se o novo dado chega antes da captura', () => {
    expect(capturaEm(TEMPO_PADRAO)).toBe(60)
    expect(leituraCerta(TEMPO_PADRAO, 10)).toBe(true)
    expect(leituraCerta(TEMPO_PADRAO, 20)).toBe(false)
  })

  it('uma troca depois da captura não estraga a leitura já feita', () => {
    expect(leituraCerta(TEMPO_PADRAO, 70)).toBe(true)
  })

  it('os instantes das fases', () => {
    expect(instantesLeitura(TEMPO_PADRAO)).toEqual({
      endereco: 0,
      selecao: 10,
      saida: 20,
      espera: 40,
      captura: 60,
      liberacao: 70,
    })
  })
})

describe('ler com o MAR trocado no meio', () => {
  it('sem tempo, a fase seguinte já mostra a nova célula, e o MDR fica com ela', () => {
    const { sistema, resultado } = lerTrocando(0x10, 0x20, 'saida')
    expect(resultado).toBe(0x22)
    expect(sistema.mar).toBe(0x20)
  })

  it('a troca não pula nem repete fases', () => {
    expect(lerTrocando(0x10, 0x20, 'saida', TEMPO_PADRAO).fases).toEqual([
      'endereco',
      'selecao',
      'saida',
      'espera',
      'captura',
      'liberacao',
    ])
  })

  it('com tempo, uma troca cedo ainda dá tempo: o MDR fica com o novo dado', () => {
    expect(lerTrocando(0x10, 0x20, 'selecao', TEMPO_PADRAO).resultado).toBe(0x22)
  })

  it('com tempo, uma troca tarde demais faz o MDR capturar X', () => {
    const { sistema, resultado } = lerTrocando(0x10, 0x20, 'saida', TEMPO_PADRAO)
    expect(resultado).toBeNull()
    expect(sistema.mdr.every((bit) => bit === 'X')).toBe(true)
  })

  it('com uma memória rápida, a mesma troca dá tempo', () => {
    const rapida = { periodo: periodoDe(50), ...MEMORIAS.rapida, esperar: true }
    expect(lerTrocando(0x10, 0x20, 'saida', rapida).resultado).toBe(0x22)
  })

  it('uma troca depois da captura não muda o que foi lido', () => {
    const { sistema, resultado } = lerTrocando(0x10, 0x20, 'liberacao', TEMPO_PADRAO)
    expect(resultado).toBe(0x11)
    expect(paraNumero(sistema.mdr)).toBe(0x11)
  })
})

describe('linha do tempo com troca de endereço', () => {
  const dados = { endereco: '10', dado: '11', mdrAntes: '00' }
  const sinal = (linha: ReturnType<typeof linhaDoTempoLeitura>, id: string) =>
    linha.sinais.find((s) => s.id === id)!.trechos

  it('o BE muda, o BD fica inválido de novo e o MDR captura X', () => {
    const linha = linhaDoTempoLeitura(TEMPO_PADRAO, dados, { t: 20, endereco: '20', dado: '22' })
    expect(linha.certo).toBe(false)
    expect(sinal(linha, 'be')).toEqual([
      { de: 0, ate: 20, valor: '10' },
      { de: 20, ate: 80, valor: '20' },
    ])
    expect(sinal(linha, 'bd')).toEqual([
      { de: 0, ate: 20, valor: 'Z' },
      { de: 20, ate: 65, valor: 'X' },
      { de: 65, ate: 70, valor: '22' },
      { de: 70, ate: 80, valor: 'Z' },
    ])
    expect(sinal(linha, 'mdr').at(-1)).toEqual({ de: 60, ate: 80, valor: 'X' })
    expect(linha.marcas).toEqual([
      { id: 'mudancaEndereco', t: 20 },
      { id: 'dadoValido', t: 65 },
      { id: 'captura', t: 60 },
    ])
    expect(linha.mudanca).toEqual({ t: 20, endereco: '20', dado: '22' })
  })

  it('uma troca antes do RD deixa o BD solto até o RD', () => {
    const linha = linhaDoTempoLeitura(TEMPO_PADRAO, dados, { t: 10, endereco: '20', dado: '22' })
    expect(linha.certo).toBe(true)
    expect(sinal(linha, 'bd')).toEqual([
      { de: 0, ate: 20, valor: 'Z' },
      { de: 20, ate: 55, valor: 'X' },
      { de: 55, ate: 70, valor: '22' },
      { de: 70, ate: 80, valor: 'Z' },
    ])
    expect(sinal(linha, 'mdr').at(-1)).toEqual({ de: 60, ate: 80, valor: '22' })
  })

  it('uma troca depois da captura não muda o MDR, e o BD termina solto', () => {
    const linha = linhaDoTempoLeitura(TEMPO_PADRAO, dados, { t: 70, endereco: '20', dado: '22' })
    expect(linha.certo).toBe(true)
    expect(sinal(linha, 'mdr').at(-1)).toEqual({ de: 60, ate: 80, valor: '11' })
    expect(sinal(linha, 'bd').at(-1)).toEqual({ de: 70, ate: 80, valor: 'Z' })
    expect(linha.marcas.find((m) => m.id === 'dadoValido')!.t).toBe(45)
  })

  it('sem troca, não há marca nem campo de mudança', () => {
    const linha = linhaDoTempoLeitura(TEMPO_PADRAO, dados)
    expect(linha.mudanca).toBeUndefined()
    expect(linha.marcas.map((m) => m.id)).toEqual(['dadoValido', 'captura'])
  })
})
