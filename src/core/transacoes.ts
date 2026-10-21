/**
 * Leitura e escrita como sequências de fases (o mesmo padrão `yield` do
 * controle.ts do CPU-8E Web). Cada `yield` devolve uma fotografia do sistema,
 * e a tela avança uma fase por clique.
 *
 * As fases seguem a ordem em que os sinais mudam numa memória assíncrona.
 * Quanto tempo cada fase leva é assunto do modelo de tempo (ADR 0003, v0.6).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
  capturarMdr,
  definirMar,
  definirMdr,
  propagar,
  soltarControles,
  type Avaliacao,
  type Bit,
  type Sistema,
} from './barramento'
import { paraNumero, type Nivel } from './nivel'

export type FaseLeitura =
  /** O MAR põe o endereço no BE. */
  | 'endereco'
  /** CS liga a memória: os decodificadores escolhem linha e coluna. */
  | 'selecao'
  /** RD liga os buffers de saída: o dado aparece no BD. */
  | 'saida'
  /** O MDR copia o BD. */
  | 'captura'
  /** RD e CS desligam: o BD volta a ficar solto. */
  | 'liberacao'

export type FaseEscrita =
  /** O MAR põe o endereço no BE. */
  | 'endereco'
  /** A CPU põe o MDR no BD. */
  | 'dado'
  /** CS liga a memória: os decodificadores escolhem linha e coluna. */
  | 'selecao'
  /** WR liga: a célula escolhida copia o BD. */
  | 'escrita'
  /** WR desliga: o valor fica guardado. */
  | 'fimEscrita'
  /** CS desliga e a CPU solta o BD. */
  | 'liberacao'

export const FASES_LEITURA: readonly FaseLeitura[] = [
  'endereco',
  'selecao',
  'saida',
  'captura',
  'liberacao',
]

export const FASES_ESCRITA: readonly FaseEscrita[] = [
  'endereco',
  'dado',
  'selecao',
  'escrita',
  'fimEscrita',
  'liberacao',
]

/** Uma fase da transação: o que mudou e como ficou o sistema. */
export interface Passo<F extends string> {
  fase: F
  mar: number
  mdr: readonly Nivel[]
  cs: Bit
  rd: Bit
  wr: Bit
  cpuDirigeDados: Bit
  avaliacao: Avaliacao
}

function passo<F extends string>(sistema: Sistema, fase: F): Passo<F> {
  const avaliacao = propagar(sistema)
  return {
    fase,
    mar: sistema.mar,
    mdr: [...sistema.mdr],
    cs: sistema.cs,
    rd: sistema.rd,
    wr: sistema.wr,
    cpuDirigeDados: sistema.cpuDirigeDados,
    avaliacao,
  }
}

/**
 * Lê um endereço. No fim, o MDR tem o dado lido, que também é o valor de
 * retorno do gerador (`null` se algum bit veio indefinido).
 */
export function* ler(
  sistema: Sistema,
  endereco: number,
): Generator<Passo<FaseLeitura>, number | null> {
  soltarControles(sistema)
  definirMar(sistema, endereco)
  yield passo(sistema, 'endereco')

  sistema.cs = 1
  yield passo(sistema, 'selecao')

  sistema.rd = 1
  const saida = passo(sistema, 'saida')
  yield saida

  capturarMdr(sistema, saida.avaliacao.bd)
  yield passo(sistema, 'captura')

  sistema.rd = 0
  sistema.cs = 0
  yield passo(sistema, 'liberacao')

  return paraNumero(sistema.mdr)
}

/** Escreve um valor num endereço. */
export function* escrever(
  sistema: Sistema,
  endereco: number,
  valor: number,
): Generator<Passo<FaseEscrita>, void> {
  soltarControles(sistema)
  definirMar(sistema, endereco)
  yield passo(sistema, 'endereco')

  definirMdr(sistema, valor)
  sistema.cpuDirigeDados = 1
  yield passo(sistema, 'dado')

  sistema.cs = 1
  yield passo(sistema, 'selecao')

  sistema.wr = 1
  yield passo(sistema, 'escrita')

  sistema.wr = 0
  yield passo(sistema, 'fimEscrita')

  sistema.cs = 0
  sistema.cpuDirigeDados = 0
  yield passo(sistema, 'liberacao')
}

/** Executa uma transação até o fim, guardando todos os passos. */
export function executar<P, R>(transacao: Generator<P, R>): { passos: P[]; resultado: R } {
  const passos: P[] = []
  for (;;) {
    const proximo = transacao.next()
    if (proximo.done) return { passos, resultado: proximo.value }
    passos.push(proximo.value)
  }
}
