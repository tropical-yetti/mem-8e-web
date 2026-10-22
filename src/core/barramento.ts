/**
 * O sistema completo: o lado da CPU (MAR, MDR e sinais de controle), os
 * barramentos e a memória.
 *
 * - O **BE** (barramento de endereços) é dirigido sempre pelo MAR.
 * - O **BD** (barramento de dados) é compartilhado: a CPU o dirige com o
 *   MDR na escrita, e a memória o dirige pelos buffers de saída na leitura.
 *   Quando ninguém dirige, ele fica solto (`Z`); quando os dois dirigem ao
 *   mesmo tempo, há contenção (`X` nos bits em que discordam).
 * - **CS**, **RD** e **WR** vêm da unidade de controle da CPU. O CPU-8E os
 *   esconde; aqui o usuário pode mexer neles diretamente.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
  aplicarEscrita,
  avaliarMemoria,
  BITS_ENDERECO,
  criarMemoria,
  LARGURA,
  type EstadoInterno,
  type Memoria,
} from './memoria'
import { paraFios, resolverFios, todos, triState, type Fios, type Nivel } from './nivel'

export type Bit = 0 | 1

export interface Sistema {
  memoria: Memoria
  /** Memory Address Register: endereço posto no BE. */
  mar: number
  /**
   * Memory Data Register (também chamado de MBR, Memory Buffer Register): dado lido da memória ou a
   * escrever nela. Guarda fios, e não um número, porque pode capturar um
   * barramento solto ou em conflito e ficar com bits indefinidos.
   */
  mdr: Nivel[]
  cs: Bit
  rd: Bit
  wr: Bit
  /** A CPU liga os seus buffers e põe o MDR no BD. */
  cpuDirigeDados: Bit
}

/** A fotografia do sistema num instante, para a tela e os testes. */
export interface Avaliacao {
  be: Fios
  /** O que a CPU põe no BD (`Z` quando não está dirigindo). */
  dadosCpu: Fios
  /** O que a memória põe no BD (`Z` com os buffers desligados). */
  dadosMemoria: Fios
  /** O BD como está no fio. */
  bd: Fios
  /** Os dois lados dirigem o BD ao mesmo tempo. */
  contencao: boolean
  interno: EstadoInterno
  /** Endereços em que houve escrita nesta avaliação, em ordem crescente. */
  escritos: number[]
}

export function criarSistema(): Sistema {
  return {
    memoria: criarMemoria(),
    mar: 0,
    mdr: paraFios(0, LARGURA),
    cs: 0,
    rd: 0,
    wr: 0,
    cpuDirigeDados: 0,
  }
}

/** Põe um valor no MAR, como o usuário editando o registrador. */
export function definirMar(sistema: Sistema, endereco: number): void {
  sistema.mar = endereco & 0xff
}

/** Põe um valor no MDR, como o usuário editando o registrador. */
export function definirMdr(sistema: Sistema, valor: number): void {
  sistema.mdr = paraFios(valor & 0xff, LARGURA)
}

/** Máximo de voltas até o circuito estabilizar (na prática bastam duas). */
const VOLTAS = 4

/**
 * Calcula o estado de todos os fios e aplica as escritas.
 *
 * Depois de uma escrita, as células mudaram, e o que a memória mostra por
 * dentro (e põe no BD, se RD estiver ligado) precisa ser recalculado. Por isso
 * o cálculo dá voltas até nenhuma célula mudar mais.
 */
export function propagar(sistema: Sistema): Avaliacao {
  const be = paraFios(sistema.mar, BITS_ENDERECO)
  const dadosCpu = sistema.mdr.map((bit) => triState(bit, sistema.cpuDirigeDados))
  const pinos = { endereco: be, cs: sistema.cs, rd: sistema.rd, wr: sistema.wr }
  const escritos = new Set<number>()

  let interno = avaliarMemoria(sistema.memoria, pinos)
  let bd = resolverFios(dadosCpu, interno.saida)
  for (let volta = 0; volta < VOLTAS; volta++) {
    const escrita = aplicarEscrita(sistema.memoria, interno, bd)
    escrita.escritos.forEach((endereco) => escritos.add(endereco))
    if (!escrita.mudou) break
    interno = avaliarMemoria(sistema.memoria, pinos)
    bd = resolverFios(dadosCpu, interno.saida)
  }

  return {
    be,
    dadosCpu,
    dadosMemoria: interno.saida,
    bd,
    contencao: dadosCpu.some((bit) => bit !== 'Z') && interno.saida.some((bit) => bit !== 'Z'),
    interno,
    escritos: [...escritos],
  }
}

/**
 * O MDR copia o BD. Um bit solto (`Z`) é lido como indefinido: o
 * registrador guarda o que estiver no fio, que pode ser qualquer coisa.
 */
export function capturarMdr(sistema: Sistema, bd: Fios): void {
  sistema.mdr = bd.map((bit) => (bit === 'Z' ? 'X' : bit))
}

/** Sinais de controle e MDR para começar uma transação limpa. */
export function soltarControles(sistema: Sistema): void {
  sistema.cs = 0
  sistema.rd = 0
  sistema.wr = 0
  sistema.cpuDirigeDados = 0
}

/** Fios em `Z` na largura do barramento de dados. */
export const BD_SOLTO: Fios = todos('Z', LARGURA)
