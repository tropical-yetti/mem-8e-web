/**
 * Store do simulador: a ponte entre o núcleo (src/core) e os componentes.
 *
 * O sistema do núcleo não é reativo (são milhares de fios). A store guarda a
 * última avaliação num `shallowRef` e um contador de versão: cada comando
 * mexe no sistema, recalcula os fios e incrementa a versão, e os componentes
 * leem o que precisam a partir disso.
 *
 * Uma transação (ler ou escrever) anda uma fase por vez. Mexer à mão no MAR,
 * no MDR ou nos sinais de controle no meio dela a interrompe: o usuário
 * assumiu o controle.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import {
  carregarPrograma,
  criarSistema,
  definirMar,
  definirMdr,
  editarCelula,
  escrever,
  FASES_ESCRITA,
  FASES_LEITURA,
  ler,
  LARGURA,
  lerCelula,
  paraNumero,
  propagar,
  TAMANHO,
  type Avaliacao,
  type FaseEscrita,
  type FaseLeitura,
  type Nivel,
  type Passo,
} from '@/core'

export type TipoTransacao = 'ler' | 'escrever'
export type Sinal = 'cs' | 'rd' | 'wr' | 'cpuDirigeDados'

interface Transacao {
  tipo: TipoTransacao
  gerador: Generator<Passo<FaseLeitura> | Passo<FaseEscrita>, unknown>
  /** Fases já mostradas (a última é a atual). */
  passos: (Passo<FaseLeitura> | Passo<FaseEscrita>)[]
  terminou: boolean
}

/**
 * Conteúdo inicial: um valor diferente em cada posição (a multiplicação por
 * um número ímpar embaralha os 256 bytes sem repetir nenhum), para que toda
 * leitura mostre um dado reconhecível, e não um 00 que parece "nada".
 */
export const CONTEUDO_INICIAL = Uint8Array.from(
  { length: TAMANHO },
  (_, endereco) => (endereco * 0x9d + 0x37) & 0xff,
)

export const useSimuladorStore = defineStore('simulador', () => {
  const sistema = markRaw(criarSistema())
  carregarPrograma(sistema.memoria, CONTEUDO_INICIAL)
  const avaliacao = shallowRef<Avaliacao>(propagar(sistema))
  /** Muda a cada alteração do sistema; os `computed` dependem dela. */
  const versao = ref(0)
  const transacao = shallowRef<Transacao | null>(null)

  function atualizar(nova?: Avaliacao) {
    avaliacao.value = nova ?? propagar(sistema)
    versao.value++
  }

  /** O usuário mexeu no sistema à mão: a transação em andamento deixa de valer. */
  function interromper() {
    transacao.value = null
  }

  // ---------------------------------------------------------------------
  // Leituras para a tela
  // ---------------------------------------------------------------------

  const mar = computed(() => {
    void versao.value
    return sistema.mar
  })

  const mdr = computed<readonly Nivel[]>(() => {
    void versao.value
    return [...sistema.mdr]
  })

  const sinais = computed(() => {
    void versao.value
    return {
      cs: sistema.cs,
      rd: sistema.rd,
      wr: sistema.wr,
      cpuDirigeDados: sistema.cpuDirigeDados,
    }
  })

  /** Os 256 bytes, como fios (cada um pode ter bits indefinidos). */
  const celulas = computed(() => {
    void versao.value
    return Array.from({ length: TAMANHO }, (_, endereco) => [
      ...lerCelula(sistema.memoria, endereco),
    ])
  })

  /** Fases da transação atual, com a posição da fase mostrada (-1 antes de começar). */
  const fases = computed(() => {
    const atual = transacao.value
    if (!atual) return null
    void versao.value
    const lista = atual.tipo === 'ler' ? FASES_LEITURA : FASES_ESCRITA
    return {
      tipo: atual.tipo,
      lista,
      indice: atual.passos.length - 1,
      terminou: atual.terminou,
    }
  })

  /** Dá para escrever só com um MDR definido (a CPU precisa saber o que pôr no BD). */
  const podeEscrever = computed(() => paraNumero(mdr.value) !== null)

  // ---------------------------------------------------------------------
  // Edições à mão
  // ---------------------------------------------------------------------

  function mudarMar(valor: number) {
    interromper()
    definirMar(sistema, valor)
    atualizar()
  }

  function alternarBitMar(bit: number) {
    mudarMar(sistema.mar ^ (1 << bit))
  }

  function mudarMdr(valor: number) {
    interromper()
    definirMdr(sistema, valor)
    atualizar()
  }

  /** Inverte um bit do MDR. Um bit indefinido passa a 1. */
  function alternarBitMdr(bit: number) {
    interromper()
    const atual = sistema.mdr[bit]
    sistema.mdr = sistema.mdr.map((nivel, i) => (i === bit ? (atual === 1 ? 0 : 1) : nivel))
    atualizar()
  }

  function alternarSinal(sinal: Sinal) {
    interromper()
    sistema[sinal] = sistema[sinal] ? 0 : 1
    atualizar()
  }

  /**
   * Edição direta de uma posição, sem passar pelos barramentos. Não
   * interrompe a transação: é como trocar o conteúdo de um chip na bancada.
   */
  function mudarCelula(endereco: number, valor: number) {
    editarCelula(sistema.memoria, endereco, valor)
    atualizar()
  }

  function carregar(bytes: Uint8Array): number {
    interromper()
    const tamanho = carregarPrograma(sistema.memoria, bytes)
    atualizar()
    return tamanho
  }

  /** Memória zerada, registradores zerados e sinais desligados. */
  function reiniciar() {
    interromper()
    Object.assign(sistema, criarSistema())
    atualizar()
  }

  // ---------------------------------------------------------------------
  // Transações passo a passo
  // ---------------------------------------------------------------------

  function iniciar(tipo: TipoTransacao) {
    const gerador =
      tipo === 'ler'
        ? ler(sistema, sistema.mar)
        : escrever(sistema, sistema.mar, paraNumero(sistema.mdr) ?? 0)
    transacao.value = { tipo, gerador, passos: [], terminou: false }
    proximaFase()
  }

  /** Mostra a próxima fase. Devolve `false` se não havia mais nenhuma. */
  function proximaFase(): boolean {
    const atual = transacao.value
    if (!atual || atual.terminou) return false
    const proximo = atual.gerador.next()
    if (proximo.done) {
      atual.terminou = true
      versao.value++
      return false
    }
    atual.passos.push(proximo.value)
    // Depois da última fase, a transação já terminou: não há o que avançar.
    const total = atual.tipo === 'ler' ? FASES_LEITURA.length : FASES_ESCRITA.length
    if (atual.passos.length === total) {
      atual.gerador.next()
      atual.terminou = true
    }
    atualizar(proximo.value.avaliacao)
    return true
  }

  /** Mostra todas as fases que faltam, até o fim. */
  function concluir() {
    while (proximaFase());
  }

  function encerrar() {
    interromper()
    versao.value++
  }

  return {
    // estado
    avaliacao,
    versao,
    mar,
    mdr,
    sinais,
    celulas,
    fases,
    podeEscrever,
    largura: LARGURA,
    // comandos
    mudarMar,
    alternarBitMar,
    mudarMdr,
    alternarBitMdr,
    alternarSinal,
    mudarCelula,
    carregar,
    reiniciar,
    iniciarLeitura: () => iniciar('ler'),
    iniciarEscrita: () => iniciar('escrever'),
    proximaFase,
    concluir,
    encerrar,
  }
})
