/**
 * Guia de primeiro acesso: a sequência de passos, a ajuda de uma parte só, o
 * foco devolvido e a lembrança de que o guia já foi visto.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guiaJaVisto, PASSOS, useGuia } from '@/guia/guia'

/** Um armazenamento em memória, no lugar do localStorage do navegador. */
function armazenamento(falhar = false) {
  const dados = new Map<string, string>()
  return {
    getItem: (k: string) => {
      if (falhar) throw new Error('sem armazenamento')
      return dados.get(k) ?? null
    },
    setItem: (k: string, v: string) => {
      if (falhar) throw new Error('sem armazenamento')
      dados.set(k, v)
    },
  }
}

/** Um elemento com foco, para conferir que o guia devolve o foco ao fechar. */
class Elemento {
  focado = 0
  focus() {
    this.focado++
  }
}

let ativo: Elemento | null
beforeEach(() => {
  ativo = new Elemento()
  vi.stubGlobal('HTMLElement', Elemento)
  vi.stubGlobal('document', {
    get activeElement() {
      return ativo
    },
  })
  vi.stubGlobal('localStorage', armazenamento())
})
afterEach(() => {
  useGuia().fechar()
  vi.unstubAllGlobals()
})

describe('guia completo', () => {
  it('começa no primeiro passo e anda para a frente e para trás', () => {
    const guia = useGuia()
    expect(guia.ativo.value).toBe(false)
    guia.iniciar()
    expect(guia.passo.value).toBe(PASSOS[0])
    guia.anterior() // no primeiro, Voltar não faz nada
    expect(guia.indice.value).toBe(0)
    guia.proximo()
    guia.proximo()
    expect(guia.passo.value?.id).toBe('sinais')
    guia.anterior()
    expect(guia.passo.value?.id).toBe('mar')
  })

  it('Próximo no último passo fecha, marca como visto e devolve o foco', () => {
    const quemTinhaFoco = ativo!
    const guia = useGuia()
    guia.iniciar()
    for (let i = 0; i < PASSOS.length; i++) guia.proximo()
    expect(guia.ativo.value).toBe(false)
    expect(guiaJaVisto()).toBe(true)
    expect(quemTinhaFoco.focado).toBe(1)
  })

  it('pular também marca como visto', () => {
    const guia = useGuia()
    guia.iniciar()
    guia.fechar()
    expect(guiaJaVisto()).toBe(true)
  })

  it('cada passo com alvo aponta para uma parte da tela, e o último sugere os experimentos', () => {
    const ids = PASSOS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(PASSOS[0]!.alvo).toBeUndefined()
    expect(PASSOS.slice(1).every((p) => p.alvo)).toBe(true)
    expect(ids.indexOf('experimentos')).toBe(ids.length - 2)
  })
})

describe('ajuda de uma parte (botão "?")', () => {
  it('abre só aquele balão, e Próximo fecha sem marcar o guia como visto', () => {
    const guia = useGuia()
    guia.ajuda('tempo')
    expect(guia.unico.value).toBe(true)
    expect(guia.passo.value?.id).toBe('tempo')
    guia.proximo()
    expect(guia.ativo.value).toBe(false)
    expect(guiaJaVisto()).toBe(false)
  })

  it('depois de uma ajuda, o guia completo volta a ter todos os passos', () => {
    const guia = useGuia()
    guia.ajuda('grade')
    guia.fechar()
    guia.iniciar()
    expect(guia.unico.value).toBe(false)
    expect(guia.indice.value).toBe(0)
  })
})

describe('sem armazenamento (modo privado)', () => {
  it('mostra o guia, e marcar como visto não quebra nada', () => {
    vi.stubGlobal('localStorage', armazenamento(true))
    expect(guiaJaVisto()).toBe(false)
    const guia = useGuia()
    guia.iniciar()
    expect(() => guia.fechar()).not.toThrow()
    expect(guiaJaVisto()).toBe(false)
  })

  it('sem nada com foco, fechar não tenta devolver o foco', () => {
    ativo = null
    const guia = useGuia()
    guia.iniciar()
    expect(() => guia.fechar()).not.toThrow()
  })

  it('Próximo e Voltar sem guia aberto não fazem nada', () => {
    const guia = useGuia()
    guia.proximo()
    guia.anterior()
    expect(guia.ativo.value).toBe(false)
  })
})
