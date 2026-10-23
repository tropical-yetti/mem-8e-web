/**
 * Store do simulador: a ponte entre o núcleo (src/core) e os componentes.
 *
 * O sistema do núcleo não é reativo (são milhares de fios). A store guarda a
 * última avaliação num `shallowRef` e um contador de versão: cada comando
 * mexe no sistema, recalcula os fios e incrementa a versão, e os componentes
 * leem o que precisam a partir disso.
 *
 * Uma transação (ler ou escrever) anda uma fase por vez. Mexer à mão no MDR
 * ou nos sinais de controle no meio dela a interrompe: o usuário assumiu o
 * controle. O MAR é a exceção numa leitura (ADR 0005): trocar o endereço no
 * meio dela é um dos experimentos, e a leitura continua com o novo endereço.
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
  escreverTexto,
  escrever,
  fasesEscrita,
  fasesLeitura,
  ler,
  lerTexto,
  linhaDoTempoEscrita,
  linhaDoTempoLeitura,
  MEMORIAS,
  paraFios,
  paraHex,
  periodoDe,
  instantesLeitura,
  type DadosLeitura,
  type LinhaDoTempo,
  type ParametrosTempo,
  type CabecalhoArquivo,
  type ResultadoLeitura,
  type TipoMemoria,
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

/** Tudo o que um experimento pode mudar, para devolver como estava no fim (ADR 0005). */
export interface Fotografia {
  mar: number
  mdr: Nivel[]
  sinais: Record<Sinal, 0 | 1>
  celulas: Nivel[][]
  clockMhz: number
  tipoMemoria: TipoMemoria
  esperar: boolean
}

/** A situação inicial de um experimento. O que não for dito fica como está. */
export interface Situacao {
  mar?: number
  mdr?: number
  /** Conteúdo de algumas posições: endereço → valor. */
  celulas?: Record<number, number>
  /** Os sinais citados ligam; os outros desligam. */
  sinais?: Partial<Record<Sinal, 0 | 1>>
  clockMhz?: number
  tipoMemoria?: TipoMemoria
  esperar?: boolean
}

interface Transacao {
  tipo: TipoTransacao
  gerador: Generator<Passo<FaseLeitura> | Passo<FaseEscrita>, unknown>
  /** Todas as fases desta transação (com ou sem espera, conforme o tempo). */
  lista: readonly (FaseLeitura | FaseEscrita)[]
  /** Fases já mostradas (a última é a atual). */
  passos: (Passo<FaseLeitura> | Passo<FaseEscrita>)[]
  terminou: boolean
  /** O diagrama de tempo desta transação (refeito se o endereço mudar no meio). */
  linha: LinhaDoTempo
  /** Os tempos com que a transação começou. */
  tempo: ParametrosTempo
  /** Os dados da leitura, para refazer o diagrama depois de uma troca de endereço. */
  dadosLeitura?: DadosLeitura
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

  // Tempo (ADR 0003): clock da CPU, memória e wait states.
  const clockMhz = ref(50)
  const tipoMemoria = ref<TipoMemoria>('media')
  const esperar = ref(true)
  const tempo = computed<ParametrosTempo>(() => ({
    periodo: periodoDe(clockMhz.value),
    ...MEMORIAS[tipoMemoria.value],
    esperar: esperar.value,
  }))

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
    return {
      tipo: atual.tipo,
      lista: atual.lista,
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
    if (!trocarEnderecoNaLeitura(valor)) interromper()
    definirMar(sistema, valor)
    atualizar()
  }

  /**
   * Numa leitura em andamento, a troca de endereço não interrompe: a próxima
   * fase já usa o novo endereço, e o diagrama marca a troca no instante dela.
   * Devolve `false` se não há leitura em andamento.
   */
  function trocarEnderecoNaLeitura(valor: number): boolean {
    const atual = transacao.value
    if (!atual || atual.tipo !== 'ler' || atual.terminou || !atual.dadosLeitura) return false
    const endereco = valor & 0xff
    const proxima = atual.lista[atual.passos.length]!
    atual.linha = linhaDoTempoLeitura(atual.tempo, atual.dadosLeitura, {
      t: instantesLeitura(atual.tempo)[proxima]!,
      endereco: paraHex(paraFios(endereco, 8)),
      dado: paraHex(lerCelula(sistema.memoria, endereco)),
    })
    return true
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

  /**
   * Abre o conteúdo da memória em texto (ADR 0006). Com erro, nada muda; sem
   * erro, a memória inteira é substituída.
   */
  function abrirTexto(texto: string): ResultadoLeitura {
    const resultado = lerTexto(texto)
    if (resultado.ok) {
      interromper()
      sistema.memoria.celulas = resultado.celulas
      atualizar()
    }
    return resultado
  }

  /** A memória inteira em texto, pronta para salvar ou copiar. */
  function textoDaMemoria(cabecalho: CabecalhoArquivo = {}): string {
    return escreverTexto(sistema.memoria, cabecalho)
  }

  /** Memória zerada, registradores zerados e sinais desligados. */
  function reiniciar() {
    interromper()
    Object.assign(sistema, criarSistema())
    atualizar()
  }

  // ---------------------------------------------------------------------
  // Experimentos: guardar, preparar e restaurar
  // ---------------------------------------------------------------------

  function fotografar(): Fotografia {
    return {
      mar: sistema.mar,
      mdr: [...sistema.mdr],
      sinais: {
        cs: sistema.cs,
        rd: sistema.rd,
        wr: sistema.wr,
        cpuDirigeDados: sistema.cpuDirigeDados,
      },
      celulas: sistema.memoria.celulas.map((celula) => [...celula]),
      clockMhz: clockMhz.value,
      tipoMemoria: tipoMemoria.value,
      esperar: esperar.value,
    }
  }

  function restaurar(foto: Fotografia) {
    interromper()
    sistema.mar = foto.mar
    sistema.mdr = [...foto.mdr]
    Object.assign(sistema, foto.sinais)
    sistema.memoria.celulas = foto.celulas.map((celula) => [...celula])
    clockMhz.value = foto.clockMhz
    tipoMemoria.value = foto.tipoMemoria
    esperar.value = foto.esperar
    atualizar()
  }

  /** Põe o simulador numa situação: sem transação, com os sinais pedidos e o resto desligado. */
  function preparar(situacao: Situacao) {
    interromper()
    sistema.cs = situacao.sinais?.cs ?? 0
    sistema.rd = situacao.sinais?.rd ?? 0
    sistema.wr = situacao.sinais?.wr ?? 0
    sistema.cpuDirigeDados = situacao.sinais?.cpuDirigeDados ?? 0
    for (const [endereco, valor] of Object.entries(situacao.celulas ?? {})) {
      editarCelula(sistema.memoria, Number(endereco), valor)
    }
    if (situacao.mar !== undefined) definirMar(sistema, situacao.mar)
    if (situacao.mdr !== undefined) definirMdr(sistema, situacao.mdr)
    if (situacao.clockMhz !== undefined) clockMhz.value = situacao.clockMhz
    if (situacao.tipoMemoria !== undefined) tipoMemoria.value = situacao.tipoMemoria
    if (situacao.esperar !== undefined) esperar.value = situacao.esperar
    atualizar()
  }

  // ---------------------------------------------------------------------
  // Transações passo a passo
  // ---------------------------------------------------------------------

  function iniciar(tipo: TipoTransacao) {
    const p = tempo.value
    const endereco = sistema.mar
    const celula = paraHex(lerCelula(sistema.memoria, endereco))
    const enderecoHex = paraHex(paraFios(endereco, 8))
    const dadosLeitura: DadosLeitura = {
      endereco: enderecoHex,
      dado: celula,
      mdrAntes: paraHex(sistema.mdr),
    }
    const transacaoNova: Transacao =
      tipo === 'ler'
        ? {
            tipo,
            gerador: ler(sistema, endereco, p),
            lista: fasesLeitura(p),
            passos: [],
            terminou: false,
            linha: linhaDoTempoLeitura(p, dadosLeitura),
            tempo: p,
            dadosLeitura,
          }
        : {
            tipo,
            gerador: escrever(sistema, endereco, paraNumero(sistema.mdr) ?? 0, p),
            lista: fasesEscrita(p),
            passos: [],
            terminou: false,
            tempo: p,
            linha: linhaDoTempoEscrita(p, {
              endereco: enderecoHex,
              dado: paraHex(sistema.mdr),
              celulaAntes: celula,
            }),
          }
    transacao.value = transacaoNova
    proximaFase()
  }

  /**
   * O diagrama de tempo: o da transação em andamento ou, sem transação, uma
   * prévia da leitura do endereço do MAR com os tempos escolhidos.
   */
  const linhaDoTempo = computed<LinhaDoTempo>(() => {
    void versao.value
    if (transacao.value) return transacao.value.linha
    return linhaDoTempoLeitura(tempo.value, {
      endereco: paraHex(paraFios(sistema.mar, 8)),
      dado: paraHex(lerCelula(sistema.memoria, sistema.mar)),
      mdrAntes: paraHex(sistema.mdr),
    })
  })

  /** Instante da fase mostrada, no diagrama de tempo (ou nada, sem transação). */
  const instanteAtual = computed<number | null>(() => {
    const f = fases.value
    if (!f || f.indice < 0) return null
    return linhaDoTempo.value.instantes[f.lista[f.indice]!] ?? null
  })

  function mudarClock(mhz: number) {
    interromper()
    clockMhz.value = mhz
    versao.value++
  }

  function mudarMemoria(tipo: TipoMemoria) {
    interromper()
    tipoMemoria.value = tipo
    versao.value++
  }

  function mudarEspera(valor: boolean) {
    interromper()
    esperar.value = valor
    versao.value++
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
    if (atual.passos.length === atual.lista.length) {
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
    tempo,
    clockMhz,
    tipoMemoria,
    esperar,
    linhaDoTempo,
    instanteAtual,
    // comandos
    mudarMar,
    alternarBitMar,
    mudarMdr,
    alternarBitMdr,
    alternarSinal,
    mudarCelula,
    abrirTexto,
    textoDaMemoria,
    reiniciar,
    fotografar,
    restaurar,
    preparar,
    iniciarLeitura: () => iniciar('ler'),
    iniciarEscrita: () => iniciar('escrever'),
    proximaFase,
    concluir,
    encerrar,
    mudarClock,
    mudarMemoria,
    mudarEspera,
  }
})
