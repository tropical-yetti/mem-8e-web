<!--
  Legendas das siglas (BE, BD, CS, RD, WR, MAR, MDR…): ao apontar com o mouse,
  receber o foco do teclado ou tocar num elemento com `data-sigla`, aparece o
  nome completo do componente.

  Um só componente atende a página toda, ouvindo os eventos no documento.
  Segue o padrão de tooltip do WAI-ARIA: enquanto a legenda aparece, o
  elemento ganha `aria-describedby` apontando para ela. Esc fecha.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, te } = useI18n()

const ID = 'legenda-sigla'
const DISTANCIA = 8
const MARGEM = 8

const alvo = ref<Element | null>(null)
const chave = ref('')
const caixa = ref<HTMLElement | null>(null)
const posicao = ref({ top: 0, left: 0, embaixo: false })
/** Mostrada por um toque: fica até o próximo toque fora. */
let porToque = false

function elementoComSigla(no: EventTarget | null): Element | null {
  return no instanceof Element ? no.closest('[data-sigla]') : null
}

async function mostrar(el: Element) {
  const sigla = el.getAttribute('data-sigla') ?? ''
  if (!te(`siglas.${sigla}.nome`)) return
  if (alvo.value && alvo.value !== el) esconder()
  alvo.value = el
  chave.value = sigla
  el.setAttribute('aria-describedby', juntarIds(el.getAttribute('aria-describedby'), ID))
  await nextTick()
  posicionar()
}

function esconder() {
  const el = alvo.value
  if (el) {
    const restantes = (el.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== ID)
      .join(' ')
    if (restantes) el.setAttribute('aria-describedby', restantes)
    else el.removeAttribute('aria-describedby')
  }
  alvo.value = null
  porToque = false
}

function juntarIds(atuais: string | null, novo: string): string {
  const ids = new Set((atuais ?? '').split(/\s+/).filter(Boolean))
  ids.add(novo)
  return [...ids].join(' ')
}

/** Acima do elemento, centrada; se não couber, embaixo. Nunca cobre o elemento. */
function posicionar() {
  const el = alvo.value
  const legenda = caixa.value
  if (!el || !legenda) return
  const r = el.getBoundingClientRect()
  const largura = legenda.offsetWidth
  const altura = legenda.offsetHeight
  const embaixo = r.top - DISTANCIA - altura < MARGEM
  const top = embaixo ? r.bottom + DISTANCIA : r.top - DISTANCIA - altura
  const left = Math.min(
    Math.max(MARGEM, r.left + r.width / 2 - largura / 2),
    window.innerWidth - largura - MARGEM,
  )
  posicao.value = { top, left, embaixo }
}

function aoEntrar(evento: PointerEvent) {
  const el = elementoComSigla(evento.target)
  if (el) {
    porToque = evento.pointerType === 'touch'
    void mostrar(el)
  }
}

function aoSair(evento: PointerEvent) {
  if (porToque || !alvo.value) return
  // Ainda dentro do mesmo elemento (passou para um filho dele): continua.
  if (evento.relatedTarget instanceof Node && alvo.value.contains(evento.relatedTarget)) return
  if (elementoComSigla(evento.target) === alvo.value) esconder()
}

function aoTocar(evento: PointerEvent) {
  // Um toque fora da legenda atual a fecha (o toque dentro de outra sigla abre a nova).
  if (porToque && elementoComSigla(evento.target) !== alvo.value) esconder()
}

function aoFocar(evento: FocusEvent) {
  const el = elementoComSigla(evento.target)
  if (el) void mostrar(el)
}

function aoDesfocar(evento: FocusEvent) {
  if (elementoComSigla(evento.target) === alvo.value && !porToque) esconder()
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && alvo.value) esconder()
}

function aoRolar() {
  if (alvo.value) posicionar()
}

onMounted(() => {
  document.addEventListener('pointerover', aoEntrar)
  document.addEventListener('pointerout', aoSair)
  document.addEventListener('pointerdown', aoTocar, true)
  document.addEventListener('focusin', aoFocar)
  document.addEventListener('focusout', aoDesfocar)
  document.addEventListener('keydown', aoTeclar)
  window.addEventListener('scroll', aoRolar, true)
  window.addEventListener('resize', aoRolar)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerover', aoEntrar)
  document.removeEventListener('pointerout', aoSair)
  document.removeEventListener('pointerdown', aoTocar, true)
  document.removeEventListener('focusin', aoFocar)
  document.removeEventListener('focusout', aoDesfocar)
  document.removeEventListener('keydown', aoTeclar)
  window.removeEventListener('scroll', aoRolar, true)
  window.removeEventListener('resize', aoRolar)
})
</script>

<template>
  <div
    v-show="alvo"
    :id="ID"
    ref="caixa"
    role="tooltip"
    class="legenda"
    :class="{ embaixo: posicao.embaixo }"
    :style="{ top: `${posicao.top}px`, left: `${posicao.left}px` }"
  >
    <template v-if="chave">
      <strong>{{ t(`siglas.${chave}.sigla`) }}</strong>
      {{ t(`siglas.${chave}.nome`) }}
    </template>
  </div>
</template>

<style scoped>
.legenda {
  position: fixed;
  z-index: 60;
  max-width: min(20rem, calc(100vw - 16px));
  padding: 5px 10px;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--fundo);
  background: var(--texto);
  border-radius: 6px;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}
strong {
  margin-right: 4px;
  font-family: var(--mono);
}
</style>
