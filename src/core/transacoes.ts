/**
 * Leitura e escrita como sequências de fases (o mesmo padrão `yield` do
 * controle.ts do CPU-8E Web). Cada `yield` devolve uma fotografia do sistema,
 * e a tela avança uma fase por clique.
 *
 * As fases seguem a ordem em que os sinais mudam numa memória assíncrona.
 * Com um modelo de tempo (ADR 0003), aparece a fase de espera (wait states)
 * quando a memória é mais lenta que a CPU, e a transação pode dar errado se
 * a CPU não esperar: a leitura captura X, e a escrita deixa a célula em X.
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
import { LARGURA } from './memoria'
import { paraNumero, todos, type Nivel } from './nivel'
import {
  escritaCerta,
  esperasEscrita,
  esperasLeitura,
  leituraCerta,
  type ParametrosTempo,
} from './tempo'

export type FaseLeitura =
  /** O MAR põe o endereço no BE. */
  | 'endereco'
  /** CS liga a memória: os decodificadores escolhem linha e coluna. */
  | 'selecao'
  /** RD liga os buffers de saída: o dado aparece no BD. */
  | 'saida'
  /** Wait states: a memória ainda não terminou e a CPU espera. */
  | 'espera'
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
  /** Wait states: o pulso de WR ainda não durou o bastante. */
  | 'espera'
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

/** As fases de uma leitura com estes tempos (a espera só aparece se houver wait states). */
export function fasesLeitura(tempo?: ParametrosTempo): readonly FaseLeitura[] {
  if (!tempo || esperasLeitura(tempo) === 0) return FASES_LEITURA
  return ['endereco', 'selecao', 'saida', 'espera', 'captura', 'liberacao']
}

/** As fases de uma escrita com estes tempos. */
export function fasesEscrita(tempo?: ParametrosTempo): readonly FaseEscrita[] {
  if (!tempo || esperasEscrita(tempo) === 0) return FASES_ESCRITA
  return ['endereco', 'dado', 'selecao', 'escrita', 'espera', 'fimEscrita', 'liberacao']
}

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
 *
 * Com `tempo`, uma memória lenta demais para uma CPU que não espera faz o
 * MDR capturar um BD ainda inválido (X).
 */
export function* ler(
  sistema: Sistema,
  endereco: number,
  tempo?: ParametrosTempo,
): Generator<Passo<FaseLeitura>, number | null> {
  soltarControles(sistema)
  definirMar(sistema, endereco)
  yield passo(sistema, 'endereco')

  sistema.cs = 1
  yield passo(sistema, 'selecao')

  sistema.rd = 1
  const saida = passo(sistema, 'saida')
  yield saida

  if (tempo && esperasLeitura(tempo) > 0) yield passo(sistema, 'espera')

  capturarMdr(sistema, !tempo || leituraCerta(tempo) ? saida.avaliacao.bd : todos('X', LARGURA))
  yield passo(sistema, 'captura')

  sistema.rd = 0
  sistema.cs = 0
  yield passo(sistema, 'liberacao')

  return paraNumero(sistema.mdr)
}

/**
 * Escreve um valor num endereço.
 *
 * Com `tempo`, um pulso de WR mais curto que t_WP (CPU que não espera uma
 * memória lenta) deixa a célula indefinida.
 */
export function* escrever(
  sistema: Sistema,
  endereco: number,
  valor: number,
  tempo?: ParametrosTempo,
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

  if (tempo && esperasEscrita(tempo) > 0) yield passo(sistema, 'espera')

  sistema.wr = 0
  if (tempo && !escritaCerta(tempo)) {
    // O pulso foi curto demais: não dá para saber o que a célula guardou.
    sistema.memoria.celulas[sistema.mar] = todos('X', LARGURA)
  }
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
