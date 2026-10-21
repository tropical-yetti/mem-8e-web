/**
 * Licença: todo arquivo do projeto declara a GPL-3.0-or-later, e o
 * repositório traz LICENSE, NOTICE.md e CHANGELOG.md (GPL-3.0, seções 4 e 5).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PASTAS = ['src', 'tests', 'public', '.github/workflows']
// JSON não aceita comentários; as mensagens de tradução ficam de fora.
const IGNORAR = /\.(png|bin|json)$/

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

const TODOS = PASTAS.flatMap((p) => arquivos(join(RAIZ, p)))
  .map((caminho) => relative(RAIZ, caminho))
  .filter((caminho) => !IGNORAR.test(caminho))

/**
 * Arquivos derivados de um arquivo do CPU-8E original (por exemplo, a tabela
 * de memória adaptada do CPU-8E Web). Cada um precisa citar a origem e o
 * copyright original no cabeçalho. Ainda não há nenhum.
 */
const DERIVADOS: string[] = []

describe('licença', () => {
  it('todo arquivo declara SPDX-License-Identifier: GPL-3.0-or-later', () => {
    const semLicenca = TODOS.filter(
      (arquivo) =>
        !readFileSync(join(RAIZ, arquivo), 'utf8').includes(
          'SPDX-License-Identifier: GPL-3.0-or-later',
        ),
    )
    expect(semLicenca).toEqual([])
  })

  it.each(DERIVADOS.map((a) => [a]))('%s cita a origem e o copyright original', (arquivo) => {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8')
    expect(texto).toMatch(/Derivado de|DERIVADO do|derivadas de/)
    expect(texto).toMatch(/Copyright 2009\/10 Joel Guilherme da Silva Filho/)
  })

  it('toda menção ao Prof. Joel leva ao currículo Lattes dele', () => {
    const LATTES = 'lattes.cnpq.br/7746085908957322'
    const comNome = [
      ...TODOS.filter((arquivo) => !arquivo.startsWith('tests/')),
      ...readdirSync(RAIZ).filter((nome) => nome.endsWith('.md')),
      ...readdirSync(join(RAIZ, 'docs'), { recursive: true })
        .map(String)
        .filter((nome) => nome.endsWith('.md'))
        .map((nome) => join('docs', nome)),
    ]
    const semLink = comNome.flatMap((arquivo) => {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8')
      return [...texto.matchAll(/Joel Guilherme da Silva Filho/g)]
        .filter((m) => {
          // O link pode vir logo antes (atributo href) ou logo depois do nome.
          const perto = texto.slice(Math.max(0, m.index - 120), m.index + m[0].length + 100)
          return !perto.includes(LATTES)
        })
        .map((m) => `${arquivo}:${texto.slice(0, m.index).split('\n').length}`)
    })
    expect(semLink).toEqual([])
  })

  it('o repositório traz LICENSE, NOTICE.md e CHANGELOG.md', () => {
    expect(readFileSync(join(RAIZ, 'LICENSE'), 'utf8')).toMatch(
      /GNU GENERAL PUBLIC LICENSE\s+Version 3/,
    )
    expect(readFileSync(join(RAIZ, 'NOTICE.md'), 'utf8')).toMatch(/GPL-3\.0-or-later/)
    expect(readFileSync(join(RAIZ, 'CHANGELOG.md'), 'utf8')).toMatch(/\d{4}-\d{2}-\d{2}/)
  })
})
