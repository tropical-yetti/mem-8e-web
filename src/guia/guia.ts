/**
 * Guia de primeiro acesso: uma sequência de balões, cada um apontando para
 * uma parte da tela, dizendo o que o usuário pode fazer e o que acontece.
 *
 * O mesmo balão serve de ajuda contextual: o botão "?" de uma seção abre só
 * o passo daquela parte.
 *
 * O estado fica neste módulo (um só guia por página), sem store: é estado de
 * interface, não do simulador.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { computed, ref } from 'vue'

export type IdPasso =
  'boasVindas' | 'mar' | 'sinais' | 'grade' | 'transacao' | 'portas' | 'tempo' | 'fim'

export interface Passo {
  id: IdPasso
  /** Valor do atributo `data-guia` do elemento apontado; sem alvo, o balão fica no centro. */
  alvo?: string
}

export const PASSOS: readonly Passo[] = [
  { id: 'boasVindas' },
  { id: 'mar', alvo: 'mar' },
  { id: 'sinais', alvo: 'sinais' },
  { id: 'grade', alvo: 'grade' },
  { id: 'transacao', alvo: 'transacao' },
  { id: 'portas', alvo: 'portas' },
  { id: 'tempo', alvo: 'tempo' },
  { id: 'fim', alvo: 'rever-guia' },
]

const CHAVE = 'mem8e.guiaVisto'

/** O usuário já viu (ou pulou) o guia neste navegador. */
export function guiaJaVisto(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    // Sem armazenamento (modo privado, por exemplo): mostra o guia, que é o mais seguro.
    return false
  }
}

function marcarVisto() {
  try {
    localStorage.setItem(CHAVE, '1')
  } catch {
    // Sem armazenamento, o guia volta na próxima visita.
  }
}

const indice = ref<number | null>(null)
/** Ajuda de uma parte só (sem Próximo/Voltar). */
const unico = ref(false)
/** Elemento que tinha o foco quando o guia abriu, para devolvê-lo no fim. */
let focoAnterior: HTMLElement | null = null

export function useGuia() {
  const ativo = computed(() => indice.value !== null)
  const passo = computed(() => (indice.value === null ? null : PASSOS[indice.value]!))

  function lembrarFoco() {
    focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }

  /** Abre o guia completo, do começo. */
  function iniciar() {
    lembrarFoco()
    unico.value = false
    indice.value = 0
  }

  /** Abre só o balão de uma parte (ajuda contextual). */
  function ajuda(id: IdPasso) {
    lembrarFoco()
    unico.value = true
    indice.value = PASSOS.findIndex((p) => p.id === id)
  }

  function fechar() {
    if (!unico.value) marcarVisto()
    indice.value = null
    unico.value = false
    focoAnterior?.focus()
    focoAnterior = null
  }

  function proximo() {
    if (indice.value === null) return
    if (unico.value || indice.value === PASSOS.length - 1) fechar()
    else indice.value++
  }

  function anterior() {
    if (indice.value !== null && indice.value > 0) indice.value--
  }

  return {
    ativo,
    passo,
    indice,
    unico,
    total: PASSOS.length,
    iniciar,
    ajuda,
    fechar,
    proximo,
    anterior,
  }
}
