/**
 * O conteúdo da memória em texto (ADR 0006): endereço e bytes em hex, como
 * um dump de memória que dá para ler e escrever à mão.
 *
 *   # comentário (também com ;)
 *   00: 3A 10 C4 FF        ← endereço opcional, seguido de ":"
 *   01 02 03               ← sem endereço, continua de onde parou
 *   F0: XX 1X0X0001        ← XX: 8 bits indefinidos; 8 dígitos 0/1/X, do bit 7 ao 0
 *
 * Ler não mexe na memória: devolve as 256 células ou o primeiro erro, com a
 * linha e a coluna. Quem chama decide o que fazer com o resultado, e assim
 * um arquivo com erro nunca deixa a memória pela metade.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { COLUNAS, LARGURA, TAMANHO, type Memoria } from './memoria'
import { paraFios, paraNumero, type Fios, type Nivel } from './nivel'

export type TipoErroArquivo =
  /** Um byte que não é hex de 2 dígitos, XX nem 8 dígitos 0/1/X. */
  | 'byteInvalido'
  /** O que vem antes do ":" não é um endereço em hex. */
  | 'enderecoInvalido'
  /** Um endereço depois de FF, ou bytes que passariam de FF. */
  | 'foraDaMemoria'
  /** A mesma posição aparece duas vezes. */
  | 'repetido'

export interface ErroArquivo {
  tipo: TipoErroArquivo
  /** Linha e coluna do problema, contadas a partir de 1. */
  linha: number
  coluna: number
  /** O trecho com problema, como está no texto. */
  trecho: string
  /** A posição de memória envolvida, quando há uma. */
  endereco?: number
}

export type ResultadoLeitura =
  | {
      ok: true
      /** As 256 células; as que o texto não cita ficam em 00. */
      celulas: Nivel[][]
      /** Quantas posições vieram do texto. */
      citadas: number
    }
  | { ok: false; erro: ErroArquivo }

const HEX_BYTE = /^[0-9a-f]{2}$/i
const BITS = /^[01x]{8}$/i
const HEX = /^[0-9a-f]+$/i

/** Um byte do texto como 8 níveis (bit 0 primeiro), ou `null` se não é válido. */
export function lerByte(trecho: string): Nivel[] | null {
  if (/^xx$/i.test(trecho)) return Array<Nivel>(LARGURA).fill('X')
  if (HEX_BYTE.test(trecho)) return paraFios(parseInt(trecho, 16), LARGURA)
  if (BITS.test(trecho)) {
    // Escrito do bit 7 ao bit 0; guardado do bit 0 ao 7.
    return [...trecho].reverse().map((c) => (c === '0' ? 0 : c === '1' ? 1 : 'X'))
  }
  return null
}

/** Um byte em texto: 2 dígitos hex, XX ou, com só alguns bits indefinidos, 8 dígitos. */
export function escreverByte(celula: Fios): string {
  const valor = paraNumero(celula)
  if (valor !== null) return valor.toString(16).toUpperCase().padStart(2, '0')
  if (celula.every((bit) => bit === 'X')) return 'XX'
  return [...celula]
    .reverse()
    .map((bit) => (bit === 0 ? '0' : bit === 1 ? '1' : 'X'))
    .join('')
}

/** Tira o comentário (de # ou ; até o fim da linha). */
function semComentario(linha: string): string {
  const fim = linha.search(/[#;]/)
  return fim < 0 ? linha : linha.slice(0, fim)
}

/** Os trechos separados por espaço, com a coluna (a partir de 1) de cada um. */
function trechos(texto: string, inicio: number): { trecho: string; coluna: number }[] {
  return [...texto.matchAll(/\S+/g)].map((m) => ({ trecho: m[0], coluna: inicio + m.index + 1 }))
}

export function lerTexto(texto: string): ResultadoLeitura {
  const celulas: Nivel[][] = Array.from({ length: TAMANHO }, () => paraFios(0, LARGURA))
  const citada = new Set<number>()
  let proximo = 0

  const linhas = texto.split(/\r\n|\r|\n/)
  for (let i = 0; i < linhas.length; i++) {
    const numero = i + 1
    let resto = semComentario(linhas[i]!)
    let deslocamento = 0

    const doisPontos = resto.indexOf(':')
    if (doisPontos >= 0) {
      const antes = resto.slice(0, doisPontos)
      const endereco = antes.trim()
      const coluna = antes.length - antes.trimStart().length + 1
      if (!HEX.test(endereco)) {
        return {
          ok: false,
          erro: { tipo: 'enderecoInvalido', linha: numero, coluna, trecho: `${endereco}:` },
        }
      }
      const valor = parseInt(endereco, 16)
      if (valor >= TAMANHO) {
        return {
          ok: false,
          erro: { tipo: 'foraDaMemoria', linha: numero, coluna, trecho: `${endereco}:` },
        }
      }
      proximo = valor
      deslocamento = doisPontos + 1
      resto = resto.slice(deslocamento)
    }

    for (const { trecho, coluna } of trechos(resto, deslocamento)) {
      const byte = lerByte(trecho)
      if (!byte) {
        return { ok: false, erro: { tipo: 'byteInvalido', linha: numero, coluna, trecho } }
      }
      if (proximo >= TAMANHO) {
        return { ok: false, erro: { tipo: 'foraDaMemoria', linha: numero, coluna, trecho } }
      }
      if (citada.has(proximo)) {
        return {
          ok: false,
          erro: { tipo: 'repetido', linha: numero, coluna, trecho, endereco: proximo },
        }
      }
      celulas[proximo] = byte
      citada.add(proximo)
      proximo++
    }
  }

  return { ok: true, celulas, citadas: citada.size }
}

export interface CabecalhoArquivo {
  /** Data em que o arquivo foi salvo (AAAA-MM-DD). */
  data?: string
  versao?: string
}

/** A memória inteira em texto: 16 linhas de 16 bytes, com endereço. */
export function escreverTexto(memoria: Memoria, cabecalho: CabecalhoArquivo = {}): string {
  const linhas = ['# MEM-8E Web: conteúdo da memória (256 × 8)']
  const salvo = [
    cabecalho.data && `salvo em ${cabecalho.data}`,
    cabecalho.versao && `versão ${cabecalho.versao}`,
  ].filter(Boolean)
  if (salvo.length) linhas.push(`# ${salvo.join(', ')}`)
  linhas.push('')
  for (let inicio = 0; inicio < TAMANHO; inicio += COLUNAS) {
    const bytes = memoria.celulas.slice(inicio, inicio + COLUNAS).map(escreverByte)
    linhas.push(`${inicio.toString(16).toUpperCase().padStart(2, '0')}: ${bytes.join(' ')}`)
  }
  return `${linhas.join('\n')}\n`
}
