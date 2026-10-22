/**
 * Documentação: o conversor de Markdown, a lista de páginas, e a coerência
 * entre os dois idiomas (mesmas páginas, mesmas âncoras) e os links internos.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { converter } from '@/docs/markdown'
import { PAGINAS, ehPagina, textoDaPagina, tituloDaPagina } from '@/docs/paginas'
import { PASSOS } from '@/guia/guia'

const pasta = (idioma: string) => new URL(`../src/docs/${idioma}/`, import.meta.url)
const ler = (idioma: string, pagina: string) =>
  readFileSync(new URL(`${pagina}.md`, pasta(idioma)), 'utf8')

/** Âncoras de uma página: {#id} explícitos nos títulos. */
function ancoras(texto: string): string[] {
  return [...texto.matchAll(/^#{2,3} .*\{#([a-z0-9-]+)\}\s*$/gm)].map((m) => m[1]!)
}

describe('converter', () => {
  it('separa o texto do componente de siglas', () => {
    const blocos = converter('# Título\n\nTexto.\n\n{{siglas}}\n\nFim.\n')
    expect(blocos.map((b) => b.tipo)).toEqual(['html', 'componente', 'html'])
    expect(blocos[1]).toEqual({ tipo: 'componente', nome: 'siglas' })
  })

  it('usa a âncora explícita {#id} e a remove do título', () => {
    const [bloco] = converter('## A matriz: linha × coluna {#matriz}\n')
    expect(bloco).toEqual({ tipo: 'html', html: '<h2 id="matriz">A matriz: linha × coluna</h2>\n' })
  })

  it('cria a âncora a partir do texto quando não há {#id}', () => {
    const [bloco] = converter('### Linhas de bit\n')
    expect(bloco).toEqual({ tipo: 'html', html: '<h3 id="linhas-de-bit">Linhas de bit</h3>\n' })
  })

  it('põe tabelas numa caixa rolável e focável, e não interpreta HTML', () => {
    const [tabela] = converter('| a | b |\n| - | - |\n| 1 | 2 |\n')
    expect(tabela?.tipo === 'html' && tabela.html).toContain(
      '<div class="tabela-rolavel" tabindex="0">',
    )
    const [script] = converter('<script>alert(1)</script>\n')
    expect(script?.tipo === 'html' && script.html).not.toContain('<script>')
  })
})

describe('páginas', () => {
  it('os dois idiomas têm exatamente as páginas da lista', () => {
    for (const idioma of ['pt', 'en']) {
      const arquivos = readdirSync(pasta(idioma)).map((nome) => nome.replace(/\.md$/, ''))
      expect(arquivos.sort()).toEqual([...PAGINAS].sort())
    }
  })

  it('cada página tem título nos dois idiomas, e inglês para outros idiomas', () => {
    for (const pagina of PAGINAS) {
      expect(tituloDaPagina(pagina, 'pt-BR')).not.toBe(pagina)
      expect(tituloDaPagina(pagina, 'en')).not.toBe(pagina)
      expect(textoDaPagina(pagina, 'fr')).toBe(textoDaPagina(pagina, 'en'))
    }
    expect(ehPagina('memoria')).toBe(true)
    expect(ehPagina('inexistente')).toBe(false)
  })

  it.each(PAGINAS.map((p) => [p]))('%s tem as mesmas âncoras em pt e en', (pagina) => {
    expect(ancoras(ler('en', pagina))).toEqual(ancoras(ler('pt', pagina)))
  })

  it('todo link interno aponta para uma página e uma âncora que existem', () => {
    const quebrados: string[] = []
    for (const idioma of ['pt', 'en']) {
      for (const pagina of PAGINAS) {
        for (const [, destino, ancora] of ler(idioma, pagina).matchAll(
          /\]\(#\/documentacao\/([a-z-]+)(?:#([a-z0-9-]+))?\)/g,
        )) {
          if (!ehPagina(destino) || (ancora && !ancoras(ler(idioma, destino)).includes(ancora))) {
            quebrados.push(`${idioma}/${pagina}: ${destino}#${ancora ?? ''}`)
          }
        }
      }
    }
    expect(quebrados).toEqual([])
  })

  it('os links "Ler mais" do guia apontam para páginas e âncoras que existem', () => {
    for (const passo of PASSOS.filter((p) => p.doc)) {
      const [pagina, ancora] = passo.doc!.split('#')
      expect(ehPagina(pagina), passo.id).toBe(true)
      if (ancora) expect(ancoras(ler('pt', pagina!)), passo.id).toContain(ancora)
    }
  })
})
