/**
 * Páginas da documentação: arquivos Markdown em src/docs/pt e src/docs/en,
 * com a mesma lista de páginas nos dois idiomas.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Ordem das páginas no menu. O nome é também o nome do arquivo e o endereço. */
export const PAGINAS = [
  'primeiros-passos',
  'memoria',
  'niveis',
  'tempo',
  'portas',
  'roteiro',
  'siglas',
] as const

export type Pagina = (typeof PAGINAS)[number]

const ARQUIVOS = import.meta.glob<string>('./*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Texto Markdown de uma página no idioma pedido (inglês para tudo que não for português). */
export function textoDaPagina(pagina: Pagina, idioma: string): string {
  const pasta = idioma.startsWith('pt') ? 'pt' : 'en'
  return ARQUIVOS[`./${pasta}/${pagina}.md`] ?? ''
}

/** Título da página: o primeiro cabeçalho "# ..." do arquivo. */
export function tituloDaPagina(pagina: Pagina, idioma: string): string {
  return /^#\s+(.+)$/m.exec(textoDaPagina(pagina, idioma))?.[1] ?? pagina
}

export function ehPagina(valor: unknown): valor is Pagina {
  return PAGINAS.includes(valor as Pagina)
}
