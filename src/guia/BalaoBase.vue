<!--
  A base dos balões do guia e dos experimentos (ADR 0005). Destaca o
  elemento apontado (um recorte sobre a página) e fica ao lado dele, com uma
  seta. O conteúdo vem do slot.

  Teclado: F6 alterna o foco entre o balão e a parte apontada, para quem não
  usa mouse poder fazer o que o balão pede e voltar a ele sem percorrer a
  página inteira. O slot recebe `irParaAlvo`, para um botão fazer o mesmo.

  Não é modal: a página continua utilizável, para o usuário experimentar o
  que o balão sugere sem fechá-lo. A cada mudança de `chave`, o balão se
  reposiciona e o foco vai para o elemento marcado com `data-foco`. Esc
  emite `fechar`.

  Com `escurecer` desligado, o alvo só ganha um contorno, e o resto da tela
  continua visível: nos experimentos, o aluno precisa ver tudo mudar.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Valor do `data-guia` do elemento apontado; sem alvo, o balão fica no centro. */
    alvo?: string
    /** Muda a cada passo: reposiciona o balão e move o foco. */
    chave: string | number
    escurecer?: boolean
    rotulo: string
    descricao?: string
  }>(),
  { alvo: undefined, escurecer: true, descricao: undefined },
)
const emit = defineEmits<{ fechar: [] }>()

const balao = ref<HTMLElement | null>(null)

/** Retângulo do alvo na tela (ou nada, para um balão no centro). */
const retangulo = ref<DOMRect | null>(null)
/** Onde fica a seta, e a posição dela ao longo da borda (x em cima/baixo, y nos lados). */
type Seta = 'cima' | 'baixo' | 'esquerda' | 'direita' | null
const posicao = ref<{ top: number; left: number; seta: Seta; setaPos: number }>({
  top: 0,
  left: 0,
  seta: null,
  setaPos: 0,
})

const MARGEM = 12
const FOLGA = 6

function elementoAlvo(): HTMLElement | null {
  return props.alvo ? document.querySelector<HTMLElement>(`[data-guia="${props.alvo}"]`) : null
}

const movimentoReduzido = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Calcula onde o balão fica: abaixo do alvo, se couber; senão acima; senão ao
 * lado (alvos altos, como a grade); e, sem espaço nenhum, no pé da tela. Sem
 * alvo, no centro.
 */
function posicionar() {
  const el = elementoAlvo()
  const caixa = balao.value
  if (!caixa) return
  const largura = caixa.offsetWidth
  const altura = caixa.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  const centro = (vw - largura) / 2

  if (!el) {
    retangulo.value = null
    posicao.value = {
      top: Math.max(MARGEM, (vh - altura) / 2),
      left: Math.max(MARGEM, centro),
      seta: null,
      setaPos: 0,
    }
    return
  }

  const r = el.getBoundingClientRect()
  retangulo.value = r
  const distancia = FOLGA + 10
  const meioX = (left: number) =>
    Math.min(Math.max(r.left + Math.min(r.width, 200) / 2, left + 20), left + largura - 20) - left
  const leftAlinhado = Math.min(Math.max(MARGEM, r.left), vw - largura - MARGEM)

  if (r.bottom + distancia + altura <= vh - MARGEM) {
    posicao.value = {
      top: r.bottom + distancia,
      left: leftAlinhado,
      seta: 'cima',
      setaPos: meioX(leftAlinhado),
    }
    return
  }
  if (r.top - distancia - altura >= MARGEM) {
    posicao.value = {
      top: r.top - distancia - altura,
      left: leftAlinhado,
      seta: 'baixo',
      setaPos: meioX(leftAlinhado),
    }
    return
  }
  // Alvo alto: ao lado, alinhado com a parte visível do alvo.
  const top = Math.min(Math.max(MARGEM, r.top), vh - altura - MARGEM)
  const setaY = Math.min(Math.max(28, Math.max(r.top, MARGEM) + 40 - top), altura - 20)
  if (r.left - distancia - largura >= MARGEM) {
    posicao.value = { top, left: r.left - distancia - largura, seta: 'direita', setaPos: setaY }
    return
  }
  if (r.right + distancia + largura <= vw - MARGEM) {
    posicao.value = { top, left: r.right + distancia, seta: 'esquerda', setaPos: setaY }
    return
  }
  // Sem espaço em volta: no pé da tela, sobre o alvo. Numa tela larga, no canto
  // direito, para cobrir menos do que o balão está explicando.
  posicao.value = {
    top: vh - altura - MARGEM,
    left: vw > 720 ? vw - largura - 2 * MARGEM : Math.max(MARGEM, centro),
    seta: null,
    setaPos: 0,
  }
}

let quadro = 0
function aoMover() {
  cancelAnimationFrame(quadro)
  quadro = requestAnimationFrame(posicionar)
}

async function mostrar() {
  await nextTick()
  const el = elementoAlvo()
  if (el) {
    // Um alvo mais alto que a tela é mostrado a partir do topo.
    const alto = el.getBoundingClientRect().height > window.innerHeight * 0.6
    el.scrollIntoView({
      block: alto ? 'start' : 'nearest',
      behavior: movimentoReduzido() ? 'auto' : 'smooth',
    })
  }
  posicionar()
  // Depois da rolagem suave, a posição do alvo muda: recalcula.
  window.setTimeout(posicionar, movimentoReduzido() ? 0 : 400)
  balao.value?.querySelector<HTMLElement>('[data-foco]')?.focus()
}

watch(
  () => props.chave,
  () => void mostrar(),
)

const SELETOR_FOCAVEL =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])'

/**
 * Leva o foco para a parte apontada: o controle marcado com
 * `data-guia-foco="<alvo>"`, se houver; senão, o primeiro controle que está
 * dentro dela, ou embaixo dela (o alvo pode ser só uma área desenhada por
 * cima, como a dos sinais de controle).
 */
function irParaAlvo() {
  const el = elementoAlvo()
  if (!el) return
  const marcado = document.querySelector<HTMLElement>(`[data-guia-foco="${props.alvo}"]`)
  if (marcado) {
    marcado.focus()
    return
  }
  const r = el.getBoundingClientRect()
  const dentro = (c: Element) => {
    const q = c.getBoundingClientRect()
    const x = q.left + q.width / 2
    const y = q.top + q.height / 2
    return q.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }
  const controles = [...document.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)].filter(
    (c) => !balao.value?.contains(c) && (el.contains(c) || dentro(c)),
  )
  controles[0]?.focus()
}

function voltarAoBalao() {
  balao.value?.querySelector<HTMLElement>('[data-foco]')?.focus()
}

function teclado(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    emit('fechar')
  } else if (evento.key === 'F6' && !evento.altKey && !evento.ctrlKey && !evento.metaKey) {
    evento.preventDefault()
    if (balao.value?.contains(document.activeElement)) irParaAlvo()
    else voltarAoBalao()
  }
}

// O conteúdo muda de tamanho (um texto mais longo): reposiciona.
let observador: ResizeObserver | null = null

onMounted(() => {
  window.addEventListener('resize', aoMover)
  window.addEventListener('scroll', aoMover, true)
  document.addEventListener('keydown', teclado)
  if (typeof ResizeObserver === 'function' && balao.value) {
    observador = new ResizeObserver(aoMover)
    observador.observe(balao.value)
  }
  void mostrar()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', aoMover)
  window.removeEventListener('scroll', aoMover, true)
  document.removeEventListener('keydown', teclado)
  observador?.disconnect()
  cancelAnimationFrame(quadro)
})

const recorte = computed(() => {
  const r = retangulo.value
  if (!r) return null
  return {
    top: `${r.top - FOLGA}px`,
    left: `${r.left - FOLGA}px`,
    width: `${r.width + 2 * FOLGA}px`,
    height: `${r.height + 2 * FOLGA}px`,
  }
})

defineExpose({ posicionar, irParaAlvo })
</script>

<template>
  <!-- Escurece a página e deixa o alvo à mostra. Só visual: não bloqueia cliques. -->
  <div
    v-if="recorte"
    class="recorte"
    :class="{ claro: !escurecer }"
    :style="recorte"
    aria-hidden="true"
  ></div>
  <div v-else-if="escurecer" class="veu" aria-hidden="true"></div>

  <div
    ref="balao"
    class="balao"
    :class="posicao.seta ? `seta-${posicao.seta}` : null"
    :style="{
      top: `${posicao.top}px`,
      left: `${posicao.left}px`,
      '--seta': `${posicao.setaPos}px`,
    }"
    role="dialog"
    aria-modal="false"
    :aria-labelledby="rotulo"
    :aria-describedby="descricao"
  >
    <slot :ir-para-alvo="irParaAlvo" />
  </div>
</template>

<style scoped>
.veu,
.recorte {
  position: fixed;
  z-index: 50;
  pointer-events: none;
}
.veu {
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
/* O recorte é um retângulo transparente com uma sombra enorme que escurece o resto. */
.recorte {
  border-radius: 8px;
  box-shadow:
    0 0 0 3px var(--destaque),
    0 0 0 100vmax rgba(0, 0, 0, 0.45);
  transition:
    top 200ms,
    left 200ms,
    width 200ms,
    height 200ms;
}
.recorte.claro {
  box-shadow: 0 0 0 3px var(--destaque);
}
.balao {
  position: fixed;
  z-index: 51;
  width: min(23rem, calc(100vw - 24px));
  padding: 14px 16px 12px;
  color: var(--texto);
  background: var(--fundo-painel);
  border: 1px solid var(--borda);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
/* A seta: um quadrado girado numa das bordas, apontando para o alvo. */
.balao[class*='seta-']::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--fundo-painel);
  border: 1px solid var(--borda);
  transform: rotate(45deg);
}
.balao.seta-cima::before {
  top: -8px;
  left: calc(var(--seta) - 7px);
  border-right: 0;
  border-bottom: 0;
}
.balao.seta-baixo::before {
  bottom: -8px;
  left: calc(var(--seta) - 7px);
  border-left: 0;
  border-top: 0;
}
.balao.seta-direita::before {
  right: -8px;
  top: calc(var(--seta) - 7px);
  border-left: 0;
  border-bottom: 0;
}
.balao.seta-esquerda::before {
  left: -8px;
  top: calc(var(--seta) - 7px);
  border-right: 0;
  border-top: 0;
}
</style>
