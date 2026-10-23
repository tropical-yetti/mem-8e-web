/**
 * Idiomas da interface (português e inglês).
 *
 * O idioma inicial é o que o usuário escolheu da última vez; se ele nunca
 * escolheu, segue o idioma do navegador.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ptBR from '@/locales/pt-BR.json'

export const IDIOMAS = ['pt-BR', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]

const CHAVE_ARMAZENAMENTO = 'mem8e.idioma'

function idiomaSalvo(): Idioma | null {
  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO)
    return IDIOMAS.find((idioma) => idioma === salvo) ?? null
  } catch {
    // Armazenamento indisponível (modo privado, por exemplo): segue sem ele.
    return null
  }
}

function idiomaDoNavegador(): Idioma {
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

const idiomaInicial = idiomaSalvo() ?? idiomaDoNavegador()

export const i18n = createI18n({
  legacy: false,
  locale: idiomaInicial,
  fallbackLocale: 'pt-BR',
  messages: { 'pt-BR': ptBR, en },
})

// O idioma da página acompanha o do texto desde o início (WCAG 3.1.1): sem isto, quem
// chega com o navegador em inglês lê o site em inglês, mas declarado como português,
// e o leitor de tela pronuncia tudo errado.
document.documentElement.lang = idiomaInicial

/** Troca o idioma da interface e lembra a escolha. */
export function trocarIdioma(idioma: Idioma): void {
  i18n.global.locale.value = idioma
  document.documentElement.lang = idioma
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, idioma)
  } catch {
    // Sem armazenamento, a escolha vale só para esta visita.
  }
}
