/**
 * Experimentos "e se…?" guiados (ADR 0005).
 *
 * Cada experimento é descrito como dados: a situação inicial e os passos. Os
 * textos ficam nas mensagens, em `experimentos.itens.<id>`. Todo experimento
 * segue três momentos:
 *
 * 1. a **pergunta** (o que você acha que vai acontecer?);
 * 2. os passos de **ação**, cada um com uma parte da tela em destaque; um
 *    passo termina sozinho quando `concluido` fica verdadeiro;
 * 3. o **resultado**, com a explicação e, quando cabe, uma observação sobre
 *    memórias reais.
 *
 * Antes de preparar, o simulador é fotografado; sair do experimento devolve
 * tudo como estava.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { computed, ref, shallowRef } from 'vue'
import { useSimuladorStore, type Fotografia, type Situacao } from '@/stores/simulador'

type Simulador = ReturnType<typeof useSimuladorStore>

export type IdExperimento = 'contencao' | 'rdWr' | 'trocaEndereco' | 'semEspera' | 'csDesligado'

export interface PassoExperimento {
  /** Chave do texto: `experimentos.itens.<experimento>.passos.<id>`. */
  id: string
  /** Valor do `data-guia` da parte da tela em destaque. */
  alvo?: string
  /** O passo termina sozinho quando isto fica verdadeiro. Sem isto, avança pelo botão. */
  concluido?: (simulador: Simulador) => boolean
}

export interface Experimento {
  id: IdExperimento
  situacao: Situacao
  /** Os passos de ação, entre a pergunta e o resultado. */
  passos: readonly PassoExperimento[]
  /** Parte da tela em destaque no resultado. */
  alvoResultado?: string
  /** O resultado traz uma observação sobre memórias reais. */
  memoriaReal?: boolean
  /**
   * Qual texto de resultado mostrar, quando depende do que o usuário fez
   * (por exemplo, em que fase ele trocou o endereço). Sem isto, `resultado`.
   */
  resultado?: (simulador: Simulador) => string
}

const indiceDaFase = (simulador: Simulador) => simulador.fases?.indice ?? -1
const leituraNaFase = (simulador: Simulador, fase: string) =>
  simulador.fases?.tipo === 'ler' &&
  indiceDaFase(simulador) >= simulador.fases.lista.indexOf(fase as never)

export const EXPERIMENTOS: readonly Experimento[] = [
  {
    id: 'contencao',
    // 5A = 0101 1010 e 3C = 0011 1100: discordam em 4 bits (66 = 0110 0110).
    situacao: { mar: 0x3a, mdr: 0x3c, celulas: { 0x3a: 0x5a }, sinais: { cs: 1, rd: 1 } },
    passos: [{ id: 'ligarMdr', alvo: 'sinais', concluido: (s) => s.sinais.cpuDirigeDados === 1 }],
    alvoResultado: 'sinais',
    memoriaReal: true,
  },
  {
    id: 'rdWr',
    situacao: { mar: 0x3a, mdr: 0x3c, celulas: { 0x3a: 0x5a }, sinais: { cs: 1, rd: 1 } },
    passos: [
      { id: 'ligarWr', alvo: 'sinais', concluido: (s) => s.sinais.wr === 1 && s.sinais.rd === 1 },
      { id: 'nadaMudou', alvo: 'grade' },
      {
        id: 'ligarMdr',
        alvo: 'sinais',
        concluido: (s) => s.sinais.cpuDirigeDados === 1 && s.sinais.wr === 1,
      },
    ],
    alvoResultado: 'grade',
    memoriaReal: true,
  },
  {
    id: 'trocaEndereco',
    situacao: {
      mar: 0x10,
      mdr: 0x00,
      celulas: { 0x10: 0x11, 0x20: 0x22 },
      clockMhz: 50,
      tipoMemoria: 'media',
      esperar: true,
    },
    passos: [
      { id: 'comecarLeitura', alvo: 'transacao', concluido: (s) => s.fases?.tipo === 'ler' },
      { id: 'ateSaida', alvo: 'transacao', concluido: (s) => leituraNaFase(s, 'saida') },
      {
        id: 'trocarMar',
        alvo: 'mar',
        concluido: (s) => s.fases?.tipo === 'ler' && s.mar === 0x20,
      },
      { id: 'ateFim', alvo: 'transacao', concluido: (s) => s.fases?.terminou === true },
    ],
    alvoResultado: 'tempo',
    resultado: (s) => {
      const linha = s.linhaDoTempo
      if (!linha.certo) return 'resultado'
      const captura = linha.marcas.find((m) => m.id === 'captura')!.t
      return (linha.mudanca?.t ?? 0) > captura ? 'resultadoDepois' : 'resultadoATempo'
    },
  },
  {
    id: 'semEspera',
    situacao: {
      mar: 0x3a,
      mdr: 0x00,
      celulas: { 0x3a: 0x5a },
      clockMhz: 50,
      tipoMemoria: 'lenta',
      esperar: false,
    },
    passos: [
      {
        id: 'lerAteFim',
        alvo: 'transacao',
        concluido: (s) => s.fases?.tipo === 'ler' && s.fases.terminou,
      },
    ],
    alvoResultado: 'tempo',
    memoriaReal: true,
  },
  {
    id: 'csDesligado',
    situacao: { mar: 0x3a, mdr: 0x00, celulas: { 0x3a: 0x5a } },
    passos: [
      {
        id: 'ligarRd',
        alvo: 'sinais',
        concluido: (s) => s.sinais.rd === 1 && s.sinais.cs === 0,
      },
    ],
    alvoResultado: 'grade',
  },
]

/** Um momento do experimento: a pergunta, um passo de ação ou o resultado. */
export type Momento =
  | { tipo: 'pergunta' }
  | { tipo: 'acao'; passo: PassoExperimento; numero: number }
  | { tipo: 'resultado' }

const atual = shallowRef<Experimento | null>(null)
/** 0 é a pergunta; de 1 a n, os passos; n + 1, o resultado. */
const posicao = ref(0)
let foto: Fotografia | null = null
/** Elemento que tinha o foco quando o experimento começou. */
let focoAnterior: HTMLElement | null = null

export function useExperimentos() {
  const simulador = useSimuladorStore()

  const momento = computed<Momento | null>(() => {
    const e = atual.value
    if (!e) return null
    if (posicao.value === 0) return { tipo: 'pergunta' }
    if (posicao.value > e.passos.length) return { tipo: 'resultado' }
    return { tipo: 'acao', passo: e.passos[posicao.value - 1]!, numero: posicao.value }
  })

  const alvo = computed(() => {
    const m = momento.value
    if (!m || m.tipo === 'pergunta') return undefined
    return m.tipo === 'acao' ? m.passo.alvo : atual.value?.alvoResultado
  })

  /** O passo atual só termina quando o usuário fizer o que ele pede. */
  const esperandoAcao = computed(() => {
    const m = momento.value
    return m?.tipo === 'acao' && m.passo.concluido !== undefined
  })

  /**
   * Avança quando o simulador chega ao que o passo pede. O balão chama isto a
   * cada mudança do simulador.
   */
  function conferir() {
    const m = momento.value
    if (m?.tipo === 'acao' && m.passo.concluido?.(simulador)) posicao.value++
  }

  function iniciar(id: IdExperimento) {
    const experimento = EXPERIMENTOS.find((e) => e.id === id)!
    if (!atual.value) {
      foto = simulador.fotografar()
      // Sem navegador (nos testes), não há foco a devolver.
      focoAnterior =
        typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
    }
    simulador.preparar(experimento.situacao)
    atual.value = experimento
    posicao.value = 0
  }

  /** Começa de novo o mesmo experimento, da pergunta. */
  function repetir() {
    if (atual.value) iniciar(atual.value.id)
  }

  function proximo() {
    const e = atual.value
    if (!e || posicao.value > e.passos.length || esperandoAcao.value) return
    posicao.value++
    conferir()
  }

  /** Sai do experimento e devolve o simulador ao estado de antes. */
  function sair() {
    if (!atual.value) return
    if (foto) simulador.restaurar(foto)
    foto = null
    atual.value = null
    posicao.value = 0
    focoAnterior?.focus()
    focoAnterior = null
  }

  return {
    atual,
    ativo: computed(() => atual.value !== null),
    momento,
    alvo,
    posicao,
    esperandoAcao,
    iniciar,
    repetir,
    proximo,
    sair,
    conferir,
  }
}
