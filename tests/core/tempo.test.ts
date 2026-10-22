/**
 * Modelo de tempo (ADR 0003): wait states, leituras e escritas que dão
 * errado sem eles, e a linha do tempo do diagrama.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
  carregarPrograma,
  criarSistema,
  dadoValidoEm,
  escritaCerta,
  escrever,
  esperasEscrita,
  esperasLeitura,
  executar,
  fasesEscrita,
  fasesLeitura,
  FASES_ESCRITA,
  FASES_LEITURA,
  leituraCerta,
  ler,
  linhaDoTempoEscrita,
  linhaDoTempoLeitura,
  MEMORIAS,
  paraNumero,
  periodoDe,
  TEMPO_PADRAO,
  valorDe,
  type LinhaDoTempo,
  type ParametrosTempo,
} from '@/core'

function tempo(mhz: number, memoria: keyof typeof MEMORIAS, esperar = true): ParametrosTempo {
  return { periodo: periodoDe(mhz), ...MEMORIAS[memoria], esperar }
}

/** O valor de um sinal no instante t. */
function valorEm(linha: LinhaDoTempo, id: string, t: number) {
  const sinal = linha.sinais.find((s) => s.id === id)!
  return sinal.trechos.find((tr) => tr.de <= t && t < tr.ate)?.valor
}

describe('wait states', () => {
  it('padrão: CPU de 50 MHz e memória média pedem 1 wait state na leitura e na escrita', () => {
    expect(TEMPO_PADRAO.periodo).toBe(20)
    // RD em 20 ns + t_OE 20 ns = 40; t_AA = 45: o dado fica válido em 45 ns.
    expect(dadoValidoEm(TEMPO_PADRAO)).toBe(45)
    expect(esperasLeitura(TEMPO_PADRAO)).toBe(1)
    // t_WP = 35 ns: um pulso de 20 ns não basta, dois ciclos (40 ns) bastam.
    expect(esperasEscrita(TEMPO_PADRAO)).toBe(1)
  })

  it('memória rápida não pede espera', () => {
    expect(esperasLeitura(tempo(50, 'rapida'))).toBe(0)
    expect(esperasEscrita(tempo(50, 'rapida'))).toBe(0)
  })

  it('clock mais rápido, mais wait states', () => {
    const esperas = [10, 25, 50, 100].map((mhz) => esperasLeitura(tempo(mhz, 'lenta')))
    expect(esperas).toEqual([...esperas].sort((a, b) => a - b))
    expect(esperasLeitura(tempo(100, 'lenta'))).toBe(10)
  })

  it('com wait states, sempre dá certo', () => {
    for (const mhz of [10, 25, 50, 100]) {
      for (const memoria of ['rapida', 'media', 'lenta'] as const) {
        expect(leituraCerta(tempo(mhz, memoria))).toBe(true)
        expect(escritaCerta(tempo(mhz, memoria))).toBe(true)
      }
    }
  })

  it('sem wait states, memória lenta demais dá errado', () => {
    expect(esperasLeitura(tempo(50, 'media', false))).toBe(0)
    expect(leituraCerta(tempo(50, 'media', false))).toBe(false)
    expect(escritaCerta(tempo(50, 'media', false))).toBe(false)
    expect(leituraCerta(tempo(10, 'media', false))).toBe(true)
  })
})

describe('transações com tempo', () => {
  it('a fase de espera só aparece quando há wait states', () => {
    expect(fasesLeitura()).toBe(FASES_LEITURA)
    expect(fasesLeitura(tempo(50, 'rapida'))).toBe(FASES_LEITURA)
    expect(fasesLeitura(TEMPO_PADRAO)).toContain('espera')
    expect(fasesEscrita(TEMPO_PADRAO)).toContain('espera')
    expect(fasesEscrita(tempo(50, 'media', false))).toBe(FASES_ESCRITA)
  })

  it('as fases do gerador batem com a lista', () => {
    for (const p of [TEMPO_PADRAO, tempo(50, 'rapida'), tempo(100, 'lenta', false)]) {
      expect(executar(ler(criarSistema(), 0, p)).passos.map((x) => x.fase)).toEqual(fasesLeitura(p))
      expect(executar(escrever(criarSistema(), 0, 1, p)).passos.map((x) => x.fase)).toEqual(
        fasesEscrita(p),
      )
    }
  })

  it('leitura com wait states captura o dado', () => {
    const sistema = criarSistema()
    carregarPrograma(sistema.memoria, Uint8Array.of(0x5a))
    expect(executar(ler(sistema, 0, TEMPO_PADRAO)).resultado).toBe(0x5a)
  })

  it('leitura sem wait states numa memória lenta captura X', () => {
    const sistema = criarSistema()
    carregarPrograma(sistema.memoria, Uint8Array.of(0x5a))
    expect(executar(ler(sistema, 0, tempo(50, 'media', false))).resultado).toBeNull()
    expect(sistema.mdr.every((bit) => bit === 'X')).toBe(true)
    // A memória continua certa: só a leitura falhou.
    expect(valorDe(sistema.memoria, 0)).toBe(0x5a)
  })

  it('escrita com pulso curto deixa a célula indefinida', () => {
    const sistema = criarSistema()
    executar(escrever(sistema, 0x10, 0x77, tempo(50, 'media', false)))
    expect(valorDe(sistema.memoria, 0x10)).toBeNull()
    executar(escrever(sistema, 0x10, 0x77, TEMPO_PADRAO))
    expect(valorDe(sistema.memoria, 0x10)).toBe(0x77)
    expect(paraNumero(sistema.mdr)).toBe(0x77)
  })
})

describe('linha do tempo da leitura', () => {
  const linha = linhaDoTempoLeitura(TEMPO_PADRAO, { endereco: '3A', dado: 'C9', mdrAntes: '00' })

  it('estados de clock: T1, T2, um Tw e T3', () => {
    expect(linha.estados.map((e) => e.nome)).toEqual(['T1', 'T2', 'Tw', 'T3'])
    expect(linha.fim).toBe(80)
    expect(linha.certo).toBe(true)
  })

  it('o BD fica solto, depois inválido, depois com o dado, depois solto', () => {
    expect(valorEm(linha, 'bd', 10)).toBe('Z')
    expect(valorEm(linha, 'bd', 30)).toBe('X')
    expect(valorEm(linha, 'bd', 50)).toBe('C9')
    expect(valorEm(linha, 'bd', 75)).toBe('Z')
  })

  it('o READY fica em 0 enquanto a memória não terminou', () => {
    expect(valorEm(linha, 'ready', 10)).toBe(1)
    expect(valorEm(linha, 'ready', 30)).toBe(0)
    expect(valorEm(linha, 'ready', 50)).toBe(1)
  })

  it('o MDR muda na captura', () => {
    expect(valorEm(linha, 'mdr', 59)).toBe('00')
    expect(valorEm(linha, 'mdr', 60)).toBe('C9')
  })

  it('o clock alterna a cada meio período, e os trechos são contínuos', () => {
    expect(valorEm(linha, 'clk', 5)).toBe(1)
    expect(valorEm(linha, 'clk', 15)).toBe(0)
    for (const sinal of linha.sinais) {
      expect(sinal.trechos[0]!.de).toBe(0)
      expect(sinal.trechos.at(-1)!.ate).toBe(linha.fim)
      sinal.trechos.slice(1).forEach((tr, i) => expect(tr.de).toBe(sinal.trechos[i]!.ate))
    }
  })

  it('ler uma célula indefinida: o X do BD é um trecho só, e a leitura de memória rápida não espera', () => {
    const linha = linhaDoTempoLeitura(tempo(10, 'rapida'), {
      endereco: '00',
      dado: 'X',
      mdrAntes: 'X',
    })
    expect(linha.esperas).toBe(0)
    const bd = linha.sinais.find((s) => s.id === 'bd')!
    expect(bd.trechos.map((t) => t.valor)).toEqual(['Z', 'X', 'Z'])
    expect(linha.sinais.find((s) => s.id === 'mdr')!.trechos).toHaveLength(1)
  })

  it('sem wait states, o MDR captura X e não há READY', () => {
    const errada = linhaDoTempoLeitura(tempo(50, 'media', false), {
      endereco: '3A',
      dado: 'C9',
      mdrAntes: '00',
    })
    expect(errada.certo).toBe(false)
    expect(errada.sinais.some((s) => s.id === 'ready')).toBe(false)
    expect(valorEm(errada, 'mdr', 45)).toBe('X')
  })
})

describe('linha do tempo da escrita', () => {
  it('WR dura o bastante com wait states, e a célula fica com o dado', () => {
    const linha = linhaDoTempoEscrita(TEMPO_PADRAO, {
      endereco: 'C4',
      dado: '3E',
      celulaAntes: '11',
    })
    expect(linha.estados.map((e) => e.nome)).toEqual(['T1', 'T2', 'Tw', 'T3'])
    // WR de 20 a 60 ns: 40 ns, mais que os 35 de t_WP.
    expect(valorEm(linha, 'wr', 25)).toBe(1)
    expect(valorEm(linha, 'wr', 55)).toBe(1)
    expect(valorEm(linha, 'wr', 65)).toBe(0)
    expect(valorEm(linha, 'celula', 10)).toBe('11')
    expect(valorEm(linha, 'celula', 70)).toBe('3E')
    expect(linha.marcas).toEqual([
      { id: 'pulsoMinimo', t: 55 },
      { id: 'fimPulso', t: 60 },
    ])
  })

  it('pulso curto demais deixa a célula em X', () => {
    const linha = linhaDoTempoEscrita(tempo(100, 'media', false), {
      endereco: 'C4',
      dado: '3E',
      celulaAntes: '11',
    })
    expect(linha.certo).toBe(false)
    expect(valorEm(linha, 'celula', 25)).toBe('X')
  })
})
