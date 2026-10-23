/**
 * A memória de 256 × 8 bits, organizada como matriz de 16 linhas por 16
 * colunas de bytes (ADR 0002), descrita bloco a bloco (ADR 0001):
 *
 *   A7–A4 → decodificador de linha  → 1 linha de palavra ativa (de 16)
 *   A3–A0 → decodificador de coluna → 1 coluna escolhida (de 16)
 *   linha ativa → linhas de bit (os 16 bytes da linha)
 *   seletor de coluna → 8 bits → buffers tri-state (CS · RD) → barramento de dados
 *
 * Na escrita, só as células com linha · coluna · CS · WR em 1 copiam o
 * barramento de dados.
 *
 * Cada bloco é calculado com as mesmas portas que o desenharia (AND, OR, NOT),
 * para que `Z` e `X` se espalhem como num circuito real: um bit de endereço
 * indefinido deixa duas linhas indefinidas, e não a memória inteira.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
  definido,
  e,
  nao,
  ou,
  paraFios,
  paraNumero,
  triState,
  type Fios,
  type Nivel,
} from './nivel'

/** Bits de endereço que escolhem a linha (os mais altos, A7–A4). */
export const BITS_LINHA = 4
/** Bits de endereço que escolhem a coluna (os mais baixos, A3–A0). */
export const BITS_COLUNA = 4
export const BITS_ENDERECO = BITS_LINHA + BITS_COLUNA
export const LINHAS = 2 ** BITS_LINHA
export const COLUNAS = 2 ** BITS_COLUNA
/** Bits por posição de memória (largura do barramento de dados). */
export const LARGURA = 8
/** Quantidade de posições: 256, endereços 00 a FF. */
export const TAMANHO = LINHAS * COLUNAS

/** A linha da matriz onde fica um endereço: o primeiro dígito hexadecimal. */
export function linhaDe(endereco: number): number {
  return endereco >> BITS_COLUNA
}

/** A coluna da matriz onde fica um endereço: o segundo dígito hexadecimal. */
export function colunaDe(endereco: number): number {
  return endereco & (COLUNAS - 1)
}

export function enderecoDe(linha: number, coluna: number): number {
  return (linha << BITS_COLUNA) | coluna
}

/**
 * O conteúdo das células. `celulas[endereco][bit]` é `0`, `1` ou `'X'`
 * (uma célula que capturou um valor indefinido, por exemplo numa escrita
 * com o barramento de dados solto). Uma célula nunca guarda `Z`.
 */
export interface Memoria {
  celulas: Nivel[][]
}

export function criarMemoria(): Memoria {
  return {
    celulas: Array.from({ length: TAMANHO }, () => paraFios(0, LARGURA)),
  }
}

/** Os 8 bits guardados num endereço. */
export function lerCelula(memoria: Memoria, endereco: number): Fios {
  return memoria.celulas[endereco]!
}

/** O byte guardado num endereço, ou `null` se algum bit está indefinido. */
export function valorDe(memoria: Memoria, endereco: number): number | null {
  return paraNumero(lerCelula(memoria, endereco))
}

/**
 * Edição direta do conteúdo, sem passar pelos barramentos: é o usuário
 * mexendo na memória pela tabela, como num programador de memórias.
 */
export function editarCelula(memoria: Memoria, endereco: number, valor: number): void {
  memoria.celulas[endereco] = paraFios(valor & 0xff, LARGURA)
}

/** Edição de um único bit, também sem passar pelos barramentos. */
export function editarBit(memoria: Memoria, endereco: number, bit: number, nivel: 0 | 1): void {
  memoria.celulas[endereco]![bit] = nivel
}

/**
 * Preenche a memória com bytes: zera tudo e copia até 256 bytes a partir do
 * endereço 00. Devolve quantos bytes foram copiados.
 */
export function carregarPrograma(memoria: Memoria, bytes: Uint8Array): number {
  const tamanho = Math.min(bytes.length, TAMANHO)
  for (let endereco = 0; endereco < TAMANHO; endereco++) {
    editarCelula(memoria, endereco, endereco < tamanho ? bytes[endereco]! : 0)
  }
  return tamanho
}

/**
 * Decodificador n → 2ⁿ com entrada de habilitação. A saída `i` é um AND da
 * habilitação com cada bit de entrada (direto se o bit de `i` é 1, invertido
 * se é 0). Com tudo definido, exatamente uma saída fica em 1.
 */
export function decodificar(entradas: Fios, habilita: Nivel): Nivel[] {
  const invertidas = entradas.map(nao)
  return Array.from({ length: 2 ** entradas.length }, (_, saida) =>
    e(habilita, ...entradas.map((a, bit) => ((saida >> bit) & 1 ? a : invertidas[bit]!))),
  )
}

/** Sinais que chegam aos pinos da memória. */
export interface PinosMemoria {
  /** Barramento de endereços, A0 a A7. */
  endereco: Fios
  /** Chip select: liga a memória. */
  cs: Nivel
  /** Leitura: liga os buffers de saída. */
  rd: Nivel
  /** Escrita: as células escolhidas copiam o barramento de dados. */
  wr: Nivel
}

/** O que acontece dentro da memória, bloco a bloco, para a tela mostrar. */
export interface EstadoInterno {
  /** Entrada do decodificador de linha: A4 a A7. */
  enderecoLinha: Nivel[]
  /** Entrada do decodificador de coluna: A0 a A3. */
  enderecoColuna: Nivel[]
  /** Linhas de palavra, uma por linha da matriz. */
  linhas: Nivel[]
  /** Saídas do decodificador de coluna. */
  colunas: Nivel[]
  /** `linhasDeBit[coluna][bit]`: o que a linha ativa põe em cada coluna. */
  linhasDeBit: Nivel[][]
  /** Os 8 bits escolhidos pelo seletor de coluna. */
  saidaSeletor: Nivel[]
  /** CS · RD: liga os buffers de saída. */
  habilitaSaida: Nivel
  /** CS · WR: libera a escrita nas células escolhidas. */
  habilitaEscrita: Nivel
  /** O que a memória põe no barramento de dados (`Z` com os buffers desligados). */
  saida: Nivel[]
}

/** Calcula todos os blocos a partir dos pinos e do conteúdo das células. */
export function avaliarMemoria(memoria: Memoria, pinos: PinosMemoria): EstadoInterno {
  const enderecoColuna = pinos.endereco.slice(0, BITS_COLUNA)
  const enderecoLinha = pinos.endereco.slice(BITS_COLUNA, BITS_ENDERECO)
  // O CS liga os decodificadores: sem ele, nenhuma linha nem coluna é escolhida.
  const linhas = decodificar(enderecoLinha, pinos.cs)
  const colunas = decodificar(enderecoColuna, pinos.cs)

  const linhasDeBit = Array.from({ length: COLUNAS }, (_, coluna) =>
    Array.from({ length: LARGURA }, (_, bit) =>
      ou(
        ...linhas.map((ativa, linha) =>
          e(ativa, lerCelula(memoria, enderecoDe(linha, coluna))[bit]!),
        ),
      ),
    ),
  )
  const saidaSeletor = Array.from({ length: LARGURA }, (_, bit) =>
    ou(...colunas.map((escolhida, coluna) => e(escolhida, linhasDeBit[coluna]![bit]!))),
  )
  const habilitaSaida = e(pinos.cs, pinos.rd)
  const habilitaEscrita = e(pinos.cs, pinos.wr)

  return {
    enderecoLinha,
    enderecoColuna,
    linhas,
    colunas,
    linhasDeBit,
    saidaSeletor,
    habilitaSaida,
    habilitaEscrita,
    saida: saidaSeletor.map((bit) => triState(bit, habilitaSaida)),
  }
}

export interface ResultadoEscrita {
  /** Endereços com a escrita liberada (ou possivelmente liberada, se indefinida). */
  escritos: number[]
  /** Algum bit guardado mudou. */
  mudou: boolean
}

/**
 * As células copiam o barramento de dados enquanto a escrita estiver
 * liberada para elas (latch: enquanto o sinal está em 1, a célula segue a
 * entrada). Com a liberação indefinida, a célula só fica certa se já
 * guardava o mesmo valor.
 */
export function aplicarEscrita(
  memoria: Memoria,
  estado: EstadoInterno,
  dados: Fios,
): ResultadoEscrita {
  const resultado: ResultadoEscrita = { escritos: [], mudou: false }
  for (let endereco = 0; endereco < TAMANHO; endereco++) {
    const libera = e(
      estado.habilitaEscrita,
      estado.linhas[linhaDe(endereco)]!,
      estado.colunas[colunaDe(endereco)]!,
    )
    if (libera === 0) continue
    const celula = memoria.celulas[endereco]!
    resultado.escritos.push(endereco)
    for (let bit = 0; bit < LARGURA; bit++) {
      const entrada = dados[bit]!
      // Um barramento solto ou em conflito deixa a célula indefinida.
      const capturado: Nivel = definido(entrada) ? entrada : 'X'
      const novo: Nivel = libera === 1 || celula[bit] === capturado ? capturado : 'X'
      if (novo !== celula[bit]) {
        celula[bit] = novo
        resultado.mudou = true
      }
    }
  }
  return resultado
}
