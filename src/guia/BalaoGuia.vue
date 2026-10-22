<!--
  O balão do guia. Destaca o elemento apontado (um recorte claro sobre a
  página escurecida) e fica ao lado dele, com uma seta.

  Não é modal: a página continua utilizável, para o usuário experimentar o
  que o balão sugere (por exemplo, clicar num bit do MAR) sem fechá-lo. O
  foco vai para o balão ao abrir e volta para onde estava ao fechar; Esc
  fecha.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGuia } from './guia'

const { t, te } = useI18n()
const guia = useGuia()

const balao = ref<HTMLElement | null>(null)
const titulo = ref<HTMLElement | null>(null)

/** Retângulo do alvo na tela (ou nada, para um balão no centro). */
const alvo = ref<DOMRect | null>(null)
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
  const nome = guia.passo.value?.alvo
  return nome ? document.querySelector<HTMLElement>(`[data-guia="${nome}"]`) : null
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
    alvo.value = null
    posicao.value = {
      top: Math.max(MARGEM, (vh - altura) / 2),
      left: Math.max(MARGEM, centro),
      seta: null,
      setaPos: 0,
    }
    return
  }

  const r = el.getBoundingClientRect()
  alvo.value = r
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

async function mostrarPasso() {
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
  titulo.value?.focus()
}

watch(
  () => guia.indice.value,
  (novo) => {
    if (novo !== null) void mostrarPasso()
  },
)

function teclado(evento: KeyboardEvent) {
  if (!guia.ativo.value) return
  if (evento.key === 'Escape') {
    evento.preventDefault()
    guia.fechar()
  }
}

onMounted(() => {
  window.addEventListener('resize', aoMover)
  window.addEventListener('scroll', aoMover, true)
  document.addEventListener('keydown', teclado)
  if (guia.ativo.value) void mostrarPasso()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', aoMover)
  window.removeEventListener('scroll', aoMover, true)
  document.removeEventListener('keydown', teclado)
  cancelAnimationFrame(quadro)
})

const ultimo = computed(() => guia.indice.value === guia.total - 1)

const recorte = computed(() => {
  const r = alvo.value
  if (!r) return null
  return {
    top: `${r.top - FOLGA}px`,
    left: `${r.left - FOLGA}px`,
    width: `${r.width + 2 * FOLGA}px`,
    height: `${r.height + 2 * FOLGA}px`,
  }
})
</script>

<template>
  <template v-if="guia.ativo.value && guia.passo.value">
    <!-- Escurece a página e deixa o alvo à mostra. Só visual: não bloqueia cliques. -->
    <div v-if="recorte" class="recorte" :style="recorte" aria-hidden="true"></div>
    <div v-else class="veu" aria-hidden="true"></div>

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
      aria-labelledby="guia-titulo"
      aria-describedby="guia-texto"
    >
      <p v-if="!guia.unico.value" class="contador">
        {{ t('guia.contador', { n: guia.indice.value! + 1, total: guia.total }) }}
      </p>
      <h2 id="guia-titulo" ref="titulo" tabindex="-1">
        {{ t(`guia.passos.${guia.passo.value.id}.titulo`) }}
      </h2>
      <p id="guia-texto" class="texto">{{ t(`guia.passos.${guia.passo.value.id}.texto`) }}</p>
      <p v-if="te(`guia.passos.${guia.passo.value.id}.experimente`)" class="experimente">
        <strong>{{ t('guia.experimente') }}</strong>
        {{ t(`guia.passos.${guia.passo.value.id}.experimente`) }}
      </p>

      <div class="botoes">
        <template v-if="guia.unico.value">
          <button type="button" class="principal" @click="guia.fechar()">
            {{ t('guia.entendi') }}
          </button>
        </template>
        <template v-else>
          <button type="button" class="pular" @click="guia.fechar()">
            {{ ultimo ? t('guia.fechar') : t('guia.pular') }}
          </button>
          <span class="espaco"></span>
          <button v-if="guia.indice.value! > 0" type="button" @click="guia.anterior()">
            {{ t('guia.voltar') }}
          </button>
          <button type="button" class="principal" @click="guia.proximo()">
            {{ ultimo ? t('guia.concluir') : t('guia.proximo') }}
          </button>
        </template>
      </div>
    </div>
  </template>
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
.contador {
  margin: 0 0 2px;
  font-size: 0.78rem;
  color: var(--texto-suave);
}
h2 {
  margin: 0 0 6px;
  font-size: 1.02rem;
}
h2:focus {
  outline: none;
}
h2:focus-visible {
  outline: 2px solid var(--destaque);
  outline-offset: 2px;
}
.texto,
.experimente {
  margin: 0 0 8px;
  font-size: 0.9rem;
  line-height: 1.45;
}
.experimente {
  padding: 6px 10px;
  border-left: 3px solid var(--fio-controle);
  background: color-mix(in srgb, var(--fio-controle) 10%, transparent);
  border-radius: 0 6px 6px 0;
}
.botoes {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.espaco {
  flex: 1;
}
button {
  padding: 5px 12px;
  font: inherit;
  font-size: 0.88rem;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 6px;
  cursor: pointer;
}
button:hover {
  background: var(--fundo-hover);
}
button.principal {
  font-weight: 600;
  color: var(--sobre-destaque);
  background: var(--destaque);
  border-color: var(--destaque);
}
button.pular {
  padding-left: 4px;
  padding-right: 4px;
  color: var(--texto-suave);
  background: none;
  border-color: transparent;
}
</style>
