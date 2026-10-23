/**
 * Memória: decodificadores, matriz, seletor, buffers e latches.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
  aplicarEscrita,
  avaliarMemoria,
  carregarPrograma,
  colunaDe,
  COLUNAS,
  criarMemoria,
  decodificar,
  editarBit,
  editarCelula,
  enderecoDe,
  lerCelula,
  linhaDe,
  LINHAS,
  paraFios,
  TAMANHO,
  todos,
  valorDe,
  type Nivel,
  type PinosMemoria,
} from '@/core'

function pinos(endereco: number, cs: Nivel, rd: Nivel, wr: Nivel): PinosMemoria {
  return { endereco: paraFios(endereco, 8), cs, rd, wr }
}

/** Posições em 1 numa lista de fios. */
function ativos(fios: Nivel[]): number[] {
  return fios.flatMap((nivel, i) => (nivel === 1 ? [i] : []))
}

describe('geometria 16 × 16', () => {
  it('o primeiro dígito hexadecimal é a linha e o segundo é a coluna', () => {
    expect(linhaDe(0x3a)).toBe(3)
    expect(colunaDe(0x3a)).toBe(0xa)
    expect(enderecoDe(3, 0xa)).toBe(0x3a)
    expect(LINHAS * COLUNAS).toBe(TAMANHO)
    expect(TAMANHO).toBe(256)
  })
})

describe('decodificador', () => {
  it('habilitado: para cada entrada, exatamente a saída de mesmo número fica em 1', () => {
    for (let entrada = 0; entrada < 16; entrada++) {
      expect(ativos(decodificar(paraFios(entrada, 4), 1))).toEqual([entrada])
    }
  })

  it('desabilitado: todas as saídas em 0', () => {
    expect(decodificar(paraFios(5, 4), 0)).toEqual(todos(0, 16))
  })

  it('um bit de entrada indefinido deixa indefinidas só as duas saídas possíveis', () => {
    // 0b01?1: pode ser 0b0101 (5) ou 0b0111 (7)
    const saidas = decodificar([1, 0, 'X', 0], 1)
    expect(saidas[1]).toBe('X') // 0b0001
    expect(saidas.flatMap((n, i) => (n === 'X' ? [i] : []))).toEqual([1, 5])
  })

  it('uma entrada solta conta como indefinida', () => {
    expect(decodificar(['Z'], 1)).toEqual(['X', 'X'])
  })
})

describe('leitura por dentro', () => {
  it('para cada endereço: uma linha, uma coluna, e o byte certo na saída', () => {
    const memoria = criarMemoria()
    for (let endereco = 0; endereco < TAMANHO; endereco++) {
      editarCelula(memoria, endereco, (endereco * 7 + 3) & 0xff)
    }
    for (let endereco = 0; endereco < TAMANHO; endereco++) {
      const estado = avaliarMemoria(memoria, pinos(endereco, 1, 1, 0))
      expect(ativos(estado.linhas)).toEqual([linhaDe(endereco)])
      expect(ativos(estado.colunas)).toEqual([colunaDe(endereco)])
      expect(estado.saidaSeletor).toEqual(lerCelula(memoria, endereco))
      expect(estado.saida).toEqual(lerCelula(memoria, endereco))
    }
  })

  it('as linhas de bit mostram os 16 bytes da linha ativa', () => {
    const memoria = criarMemoria()
    for (let coluna = 0; coluna < COLUNAS; coluna++) {
      editarCelula(memoria, enderecoDe(2, coluna), 0x20 + coluna)
    }
    const estado = avaliarMemoria(memoria, pinos(0x25, 1, 0, 0))
    estado.linhasDeBit.forEach((bits, coluna) => {
      expect(bits).toEqual(paraFios(0x20 + coluna, 8))
    })
  })

  it('sem CS, nenhuma linha nem coluna é escolhida e a saída fica solta', () => {
    const memoria = criarMemoria()
    editarCelula(memoria, 0x42, 0xff)
    const estado = avaliarMemoria(memoria, pinos(0x42, 0, 1, 0))
    expect(estado.linhas).toEqual(todos(0, 16))
    expect(estado.colunas).toEqual(todos(0, 16))
    expect(estado.saida).toEqual(todos('Z', 8))
  })

  it('com CS mas sem RD, o dado chega ao seletor mas não sai', () => {
    const memoria = criarMemoria()
    editarCelula(memoria, 0x42, 0x81)
    const estado = avaliarMemoria(memoria, pinos(0x42, 1, 0, 0))
    expect(estado.saidaSeletor).toEqual(paraFios(0x81, 8))
    expect(estado.habilitaSaida).toBe(0)
    expect(estado.saida).toEqual(todos('Z', 8))
  })

  it('uma célula indefinida sai indefinida', () => {
    const memoria = criarMemoria()
    memoria.celulas[0x10]![3] = 'X'
    const estado = avaliarMemoria(memoria, pinos(0x10, 1, 1, 0))
    expect(estado.saida[3]).toBe('X')
    expect(estado.saida[2]).toBe(0)
  })
})

describe('escrita por dentro', () => {
  it('só a célula escolhida copia o barramento', () => {
    const memoria = criarMemoria()
    const estado = avaliarMemoria(memoria, pinos(0x5c, 1, 0, 1))
    const resultado = aplicarEscrita(memoria, estado, paraFios(0xa7, 8))
    expect(resultado).toEqual({ escritos: [0x5c], mudou: true })
    for (let endereco = 0; endereco < TAMANHO; endereco++) {
      expect(valorDe(memoria, endereco)).toBe(endereco === 0x5c ? 0xa7 : 0)
    }
  })

  it('escrever o mesmo valor não muda nada, mas a escrita aconteceu', () => {
    const memoria = criarMemoria()
    const estado = avaliarMemoria(memoria, pinos(0x01, 1, 0, 1))
    expect(aplicarEscrita(memoria, estado, todos(0, 8))).toEqual({ escritos: [1], mudou: false })
  })

  it('sem WR ou sem CS, nada é escrito', () => {
    const memoria = criarMemoria()
    for (const [cs, wr] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const estado = avaliarMemoria(memoria, pinos(0x01, cs, 0, wr))
      expect(aplicarEscrita(memoria, estado, todos(1, 8)).escritos).toEqual([])
    }
    expect(valorDe(memoria, 0x01)).toBe(0)
  })

  it('escrever com o barramento solto deixa a célula indefinida', () => {
    const memoria = criarMemoria()
    const estado = avaliarMemoria(memoria, pinos(0x30, 1, 0, 1))
    aplicarEscrita(memoria, estado, todos('Z', 8))
    expect(lerCelula(memoria, 0x30)).toEqual(todos('X', 8))
    expect(valorDe(memoria, 0x30)).toBeNull()
  })

  it('com um bit de endereço indefinido, as duas células possíveis só mantêm o que já concordava', () => {
    const memoria = criarMemoria()
    editarCelula(memoria, 0x00, 0x0f)
    editarCelula(memoria, 0x01, 0xff)
    const estado = avaliarMemoria(memoria, {
      endereco: ['X', 0, 0, 0, 0, 0, 0, 0],
      cs: 1,
      rd: 0,
      wr: 1,
    })
    const resultado = aplicarEscrita(memoria, estado, paraFios(0x0f, 8))
    expect(resultado.escritos).toEqual([0x00, 0x01])
    expect(valorDe(memoria, 0x00)).toBe(0x0f)
    expect(lerCelula(memoria, 0x01)).toEqual([1, 1, 1, 1, 'X', 'X', 'X', 'X'])
  })
})

describe('edição direta e programas', () => {
  it('edita byte e bit sem passar pelos barramentos', () => {
    const memoria = criarMemoria()
    editarCelula(memoria, 0xff, 0x1ff)
    expect(valorDe(memoria, 0xff)).toBe(0xff)
    editarBit(memoria, 0xff, 7, 0)
    expect(valorDe(memoria, 0xff)).toBe(0x7f)
  })

  it.each([
    ['um programa curto', Uint8Array.of(0x3a, 0x10, 0xc4, 0xff, 0x00, 0x7e)],
    ['a memória inteira', Uint8Array.from({ length: TAMANHO }, (_, i) => (i * 37 + 11) & 0xff)],
  ])('preenche %s byte a byte, a partir de 00', (_, bytes) => {
    const memoria = criarMemoria()
    editarCelula(memoria, 0xfe, 0x55) // sobra de antes: precisa ser apagada
    expect(carregarPrograma(memoria, bytes)).toBe(bytes.length)
    for (let endereco = 0; endereco < TAMANHO; endereco++) {
      expect(valorDe(memoria, endereco)).toBe(endereco < bytes.length ? bytes[endereco] : 0)
    }
  })

  it('um arquivo maior que a memória é cortado em 256 bytes', () => {
    const bytes = Uint8Array.from({ length: 300 }, (_, i) => i & 0xff)
    const memoria = criarMemoria()
    expect(carregarPrograma(memoria, bytes)).toBe(256)
    expect(valorDe(memoria, 0xff)).toBe(0xff)
  })
})
