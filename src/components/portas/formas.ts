/**
 * Formas das portas lógicas em SVG (símbolos usuais, padrão ANSI), como
 * caminhos (`d`) a partir do canto de cima à esquerda de cada porta.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Porta AND: lado reto à esquerda e meia-lua à direita. */
export function formaE(x: number, y: number, largura: number, altura: number): string {
  const r = altura / 2
  return `M ${x} ${y} H ${x + largura - r} A ${r} ${r} 0 0 1 ${x + largura - r} ${y + altura} H ${x} Z`
}

/** Porta OR: costas côncavas e bico à direita. */
export function formaOu(x: number, y: number, largura: number, altura: number): string {
  const meio = y + altura / 2
  return [
    `M ${x} ${y}`,
    `Q ${x + largura * 0.6} ${y} ${x + largura} ${meio}`,
    `Q ${x + largura * 0.6} ${y + altura} ${x} ${y + altura}`,
    `Q ${x + largura * 0.28} ${meio} ${x} ${y}`,
    'Z',
  ].join(' ')
}

/** Triângulo apontando para baixo (NOT ou buffer desenhado na vertical). */
export function trianguloBaixo(x: number, y: number, largura: number, altura: number): string {
  return `M ${x} ${y} H ${x + largura} L ${x + largura / 2} ${y + altura} Z`
}

/** Triângulo apontando para a direita (buffer tri-state). */
export function trianguloDireita(x: number, y: number, largura: number, altura: number): string {
  return `M ${x} ${y} L ${x + largura} ${y + altura / 2} L ${x} ${y + altura} Z`
}

/** Pontos de entrada de uma porta, distribuídos na altura dela. */
export function entradas(y: number, altura: number, quantidade: number): number[] {
  const passo = altura / (quantidade + 1)
  return Array.from({ length: quantidade }, (_, i) => y + passo * (i + 1))
}
