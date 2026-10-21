/**
 * Sinais de 4 valores (ADR 0001).
 *
 * Um fio pode estar em:
 * - `0` ou `1`: nível lógico definido;
 * - `'Z'`: alta impedância, ninguém está dirigindo o fio (ele está "solto");
 * - `'X'`: indefinido, por conflito (dois circuitos dirigindo valores
 *   diferentes) ou porque a entrada de quem dirige é ela mesma indefinida.
 *
 * As portas seguem a regra usual dos simuladores lógicos: uma entrada
 * solta (`Z`) é lida como `X`, porque uma porta CMOS com a entrada no ar
 * pode ler qualquer coisa.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Nivel = 0 | 1 | 'Z' | 'X'

/** Um grupo de fios, como um barramento. O índice é o número do bit: `[0]` é o bit 0 (menos significativo). */
export type Fios = readonly Nivel[]

/** `0` ou `1`. */
export function definido(nivel: Nivel): nivel is 0 | 1 {
  return nivel === 0 || nivel === 1
}

/** Porta NOT. */
export function nao(a: Nivel): Nivel {
  return definido(a) ? ((1 - a) as 0 | 1) : 'X'
}

/** Porta AND de quantas entradas forem: um `0` basta para a saída ser `0`. */
export function e(...entradas: Nivel[]): Nivel {
  if (entradas.includes(0)) return 0
  return entradas.every((a) => a === 1) ? 1 : 'X'
}

/** Porta OR de quantas entradas forem: um `1` basta para a saída ser `1`. */
export function ou(...entradas: Nivel[]): Nivel {
  if (entradas.includes(1)) return 1
  return entradas.every((a) => a === 0) ? 0 : 'X'
}

/**
 * Buffer tri-state: com `habilita = 1`, copia a entrada para a saída; com
 * `habilita = 0`, se desliga do fio (`Z`). Com o controle indefinido, não dá
 * para saber se ele está dirigindo, então a saída é `X`.
 */
export function triState(entrada: Nivel, habilita: Nivel): Nivel {
  if (habilita === 0) return 'Z'
  if (habilita === 1) return definido(entrada) ? entrada : 'X'
  return 'X'
}

/**
 * O valor de um fio ligado a vários circuitos ao mesmo tempo. Quem está em
 * `Z` não conta. Ninguém dirigindo dá `Z`; todos concordando dá o valor
 * comum; qualquer discordância (ou um `X`) dá `X`: contenção.
 */
export function resolver(...fontes: Nivel[]): Nivel {
  const ativas = fontes.filter((f) => f !== 'Z')
  if (ativas.length === 0) return 'Z'
  const [primeira] = ativas
  return ativas.every((f) => f === primeira && f !== 'X') ? primeira! : 'X'
}

/** Resolve, bit a bit, vários grupos de fios ligados juntos. */
export function resolverFios(...grupos: Fios[]): Nivel[] {
  const largura = Math.max(...grupos.map((g) => g.length))
  return Array.from({ length: largura }, (_, bit) => resolver(...grupos.map((g) => g[bit] ?? 'Z')))
}

/** Os bits de um número, do bit 0 em diante. */
export function paraFios(valor: number, largura: number): Nivel[] {
  return Array.from({ length: largura }, (_, bit) => ((valor >> bit) & 1) as 0 | 1)
}

/** O número formado pelos fios, ou `null` se algum deles não está em `0` ou `1`. */
export function paraNumero(fios: Fios): number | null {
  let valor = 0
  for (let bit = fios.length - 1; bit >= 0; bit--) {
    const nivel = fios[bit]!
    if (!definido(nivel)) return null
    valor = (valor << 1) | nivel
  }
  return valor
}

/** Todos os fios no mesmo nível. */
export function todos(nivel: Nivel, largura: number): Nivel[] {
  return Array<Nivel>(largura).fill(nivel)
}

/**
 * Texto em hexadecimal para mostrar na tela, com um dígito por grupo de
 * 4 bits. Um dígito com algum bit em `Z` aparece como `Z`, e com algum bit
 * em `X` (ou misturando `Z` com valores) aparece como `X`.
 */
export function paraHex(fios: Fios): string {
  const digitos: string[] = []
  for (let inicio = 0; inicio < fios.length; inicio += 4) {
    const grupo = fios.slice(inicio, inicio + 4)
    const valor = paraNumero(grupo)
    if (valor !== null) digitos.unshift(valor.toString(16).toUpperCase())
    else digitos.unshift(grupo.every((n) => n === 'Z') ? 'Z' : 'X')
  }
  return digitos.join('')
}
