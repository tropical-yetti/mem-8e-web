/**
 * Experimentos "e se…?" (ADR 0005): cada um prepara a situação, segue os
 * passos e chega ao resultado que o texto promete. Sair devolve tudo.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFileSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { paraHex, paraNumero } from '@/core'
import { EXPERIMENTOS, useExperimentos } from '@/experimentos/experimentos'
import { useSimuladorStore } from '@/stores/simulador'

beforeEach(() => {
  setActivePinia(createPinia())
  useExperimentos().sair()
})

/** Os bits de um barramento, do 7 ao 0, como no texto do resultado. */
const bits = (fios: readonly (0 | 1 | 'Z' | 'X')[]) => [...fios].reverse().join('')

function comecar(id: (typeof EXPERIMENTOS)[number]['id']) {
  const simulador = useSimuladorStore()
  const e = useExperimentos()
  e.iniciar(id)
  expect(e.momento.value).toEqual({ tipo: 'pergunta' })
  e.proximo()
  /** Faz algo no simulador e confere se o balão avançou (como faz o componente). */
  const fazer = (acao: () => void) => {
    acao()
    e.conferir()
  }
  return { simulador, e, fazer }
}

describe('contenção no BD', () => {
  it('o BD fica 0XX1 1XX0, e a célula e o MDR não mudam', () => {
    const { simulador, e, fazer } = comecar('contencao')
    expect(paraHex(simulador.avaliacao.bd)).toBe('5A')
    expect(e.esperandoAcao.value).toBe(true)
    e.proximo() // não adianta: o passo espera a ação
    expect(e.momento.value?.tipo).toBe('acao')
    fazer(() => simulador.alternarSinal('cpuDirigeDados'))
    expect(e.momento.value).toEqual({ tipo: 'resultado' })
    expect(bits(simulador.avaliacao.bd)).toBe('0XX11XX0')
    expect(paraHex(simulador.avaliacao.bd)).toBe('XX')
    expect(paraNumero(simulador.celulas[0x3a]!)).toBe(0x5a)
    expect(paraNumero(simulador.mdr)).toBe(0x3c)
  })
})

describe('RD e WR juntos', () => {
  it('sem a CPU, nada muda; com a CPU, a célula fica 0XX1 1XX0', () => {
    const { simulador, e, fazer } = comecar('rdWr')
    fazer(() => simulador.alternarSinal('wr'))
    expect(e.momento.value).toMatchObject({ tipo: 'acao', passo: { id: 'nadaMudou' } })
    expect(paraNumero(simulador.celulas[0x3a]!)).toBe(0x5a)
    e.proximo()
    fazer(() => simulador.alternarSinal('cpuDirigeDados'))
    expect(e.momento.value).toEqual({ tipo: 'resultado' })
    expect(bits(simulador.celulas[0x3a]!)).toBe('0XX11XX0')
    // Mesmo desligando tudo, a célula continua estragada.
    simulador.alternarSinal('wr')
    simulador.alternarSinal('rd')
    simulador.alternarSinal('cpuDirigeDados')
    expect(bits(simulador.celulas[0x3a]!)).toBe('0XX11XX0')
  })
})

describe('endereço trocado no meio da leitura', () => {
  function ateTrocar() {
    const r = comecar('trocaEndereco')
    r.fazer(() => r.simulador.iniciarLeitura())
    expect(r.e.momento.value).toMatchObject({ passo: { id: 'ateSaida' } })
    return r
  }

  it('trocando depois de "RD liga", o MDR fica com X', () => {
    const { simulador, e, fazer } = ateTrocar()
    fazer(() => simulador.proximaFase()) // seleção
    fazer(() => simulador.proximaFase()) // saída
    expect(e.momento.value).toMatchObject({ passo: { id: 'trocarMar' } })
    fazer(() => simulador.mudarMar(0x20))
    expect(e.momento.value).toMatchObject({ passo: { id: 'ateFim' } })
    fazer(() => simulador.concluir())
    expect(e.momento.value).toEqual({ tipo: 'resultado' })
    expect(simulador.mdr.every((b) => b === 'X')).toBe(true)
    expect(e.atual.value!.resultado!(simulador)).toBe('resultado')
  })

  it('trocando cedo, o MDR fica com 22, o dado do outro endereço', () => {
    const { simulador, e } = ateTrocar()
    simulador.mudarMar(0x20) // antes de "CS liga"
    simulador.concluir()
    expect(paraNumero(simulador.mdr)).toBe(0x22)
    expect(e.atual.value!.resultado!(simulador)).toBe('resultadoATempo')
  })

  it('trocando depois da captura, o MDR fica com 11', () => {
    const { simulador, e } = ateTrocar()
    for (let i = 0; i < 4; i++) simulador.proximaFase() // até a captura
    simulador.mudarMar(0x20)
    simulador.concluir()
    expect(paraNumero(simulador.mdr)).toBe(0x11)
    expect(e.atual.value!.resultado!(simulador)).toBe('resultadoDepois')
  })
})

describe('CPU que não espera', () => {
  it('a leitura dá X, e com wait states dá certo', () => {
    const { simulador, e, fazer } = comecar('semEspera')
    expect(simulador.tipoMemoria).toBe('lenta')
    expect(simulador.esperar).toBe(false)
    fazer(() => {
      simulador.iniciarLeitura()
      simulador.concluir()
    })
    expect(e.momento.value).toEqual({ tipo: 'resultado' })
    expect(simulador.mdr.every((b) => b === 'X')).toBe(true)
    expect(simulador.linhaDoTempo.marcas.find((m) => m.id === 'captura')!.t).toBe(40)
    expect(simulador.linhaDoTempo.marcas.find((m) => m.id === 'dadoValido')!.t).toBe(120)
    simulador.mudarEspera(true)
    simulador.iniciarLeitura()
    simulador.concluir()
    expect(paraNumero(simulador.mdr)).toBe(0x5a)
  })
})

describe('CS desligado', () => {
  it('com só o RD, o BD fica solto e nenhuma linha ou coluna acende', () => {
    const { simulador, e, fazer } = comecar('csDesligado')
    fazer(() => simulador.alternarSinal('rd'))
    expect(e.momento.value).toEqual({ tipo: 'resultado' })
    expect(simulador.avaliacao.bd.every((b) => b === 'Z')).toBe(true)
    expect(simulador.avaliacao.interno.linhas.every((n) => n === 0)).toBe(true)
    expect(simulador.avaliacao.interno.colunas.every((n) => n === 0)).toBe(true)
  })
})

describe('entrar e sair', () => {
  it('sair devolve memória, registradores, sinais e tempo', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x77)
    simulador.mudarMdr(0x99)
    simulador.alternarSinal('cs')
    simulador.mudarClock(25)
    const antes = simulador.fotografar()
    const e = useExperimentos()
    for (const { id } of EXPERIMENTOS) {
      e.iniciar(id)
      simulador.alternarSinal('wr')
      simulador.alternarSinal('cpuDirigeDados')
      simulador.mudarCelula(0x00, 0x12)
      e.sair()
      expect(simulador.fotografar()).toEqual(antes)
      expect(e.ativo.value).toBe(false)
    }
  })

  it('repetir volta à pergunta, com a situação de novo', () => {
    const { simulador, e, fazer } = comecar('contencao')
    fazer(() => simulador.alternarSinal('cpuDirigeDados'))
    e.repetir()
    expect(e.momento.value).toEqual({ tipo: 'pergunta' })
    expect(simulador.sinais.cpuDirigeDados).toBe(0)
    e.sair()
    // Repetir não troca a fotografia: sair ainda devolve o estado de antes do primeiro.
    expect(simulador.sinais.cs).toBe(0)
  })

  it('escolher outro experimento sem sair mantém a fotografia do começo', () => {
    const simulador = useSimuladorStore()
    simulador.mudarMar(0x05)
    const e = useExperimentos()
    e.iniciar('contencao')
    e.iniciar('semEspera')
    e.sair()
    expect(simulador.mar).toBe(0x05)
    expect(simulador.tipoMemoria).toBe('media')
  })

  it('sem experimento, os comandos não fazem nada', () => {
    const e = useExperimentos()
    e.proximo()
    e.repetir()
    e.conferir()
    expect(e.momento.value).toBeNull()
    expect(e.alvo.value).toBeUndefined()
  })

  it('um passo sem ação avança pelo botão; o resultado não avança mais', () => {
    const { simulador, e, fazer } = comecar('rdWr')
    fazer(() => simulador.alternarSinal('wr'))
    expect(e.esperandoAcao.value).toBe(false)
    expect(e.alvo.value).toBe('grade')
    e.proximo()
    fazer(() => simulador.alternarSinal('cpuDirigeDados'))
    expect(e.alvo.value).toBe('grade')
    e.proximo()
    expect(e.momento.value).toEqual({ tipo: 'resultado' })
  })
})

describe('textos', () => {
  const mensagens = (arquivo: string) =>
    JSON.parse(readFileSync(`src/locales/${arquivo}.json`, 'utf8')).experimentos.itens

  it('cada experimento tem título, resumo, pergunta, passos e resultados nos dois idiomas', () => {
    for (const arquivo of ['pt-BR', 'en']) {
      const itens = mensagens(arquivo)
      for (const exp of EXPERIMENTOS) {
        const item = itens[exp.id]
        expect(item, `${arquivo}: ${exp.id}`).toBeDefined()
        for (const chave of ['titulo', 'resumo', 'pergunta', 'resultado']) {
          expect(item[chave], `${arquivo}: ${exp.id}.${chave}`).toBeTypeOf('string')
        }
        for (const passo of exp.passos) {
          expect(item.passos[passo.id], `${arquivo}: ${exp.id}.${passo.id}`).toBeTypeOf('string')
        }
        if (exp.memoriaReal) expect(item.real, `${arquivo}: ${exp.id}.real`).toBeTypeOf('string')
      }
      expect(itens.trocaEndereco.resultadoATempo).toBeTypeOf('string')
      expect(itens.trocaEndereco.resultadoDepois).toBeTypeOf('string')
    }
  })
})
