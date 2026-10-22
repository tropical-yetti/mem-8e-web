<!--
  Um decodificador 4 → 16 em portas lógicas: 4 entradas, 4 portas NOT que
  fazem os complementos, uma entrada de habilitação (EN) e 16 portas AND de
  5 entradas. Cada AND recebe EN e, de cada bit, ou o fio direto ou o
  invertido: a combinação dela só fica toda em 1 para um único endereço.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { decodificar, nao, type Nivel } from '@/core'
import { entradas as pontosDeEntrada, formaE, trianguloBaixo } from './formas'

const props = defineProps<{
  /** Nome dos bits de entrada, do bit 0 em diante (por exemplo, A4…A7). */
  nomes: readonly string[]
  entradas: readonly Nivel[]
  habilita: Nivel
  /** "linha" ou "coluna": nome das saídas. */
  saida: string
}>()

const { t } = useI18n()

const saidas = computed(() => decodificar(props.entradas, props.habilita))

// Geometria
const TOPO_TRILHOS = 62
const X0 = 30
const PASSO_PAR = 50
const DISTANCIA_NEG = 22
const X_EN = X0 + 4 * PASSO_PAR
const X_PORTA = X_EN + 40
const LARGURA_PORTA = 30
const ALTURA_PORTA = 22
const Y0 = 78
const PASSO_PORTA = 27
const X_FIM = X_PORTA + LARGURA_PORTA + 34
const ALTURA = Y0 + 16 * PASSO_PORTA + 6
const LARGURA = X_FIM + 34

const HEX = (n: number) => n.toString(16).toUpperCase()

/** Os 9 trilhos verticais: cada bit direto e invertido, e o EN. */
const trilhos = computed(() => {
  const lista: { x: number; nivel: Nivel; nome: string }[] = []
  props.entradas.forEach((nivel, bit) => {
    lista.push({ x: X0 + bit * PASSO_PAR, nivel, nome: props.nomes[bit]! })
    lista.push({ x: X0 + bit * PASSO_PAR + DISTANCIA_NEG, nivel: nao(nivel), nome: '' })
  })
  lista.push({ x: X_EN, nivel: props.habilita, nome: 'EN' })
  return lista
})

/** As 16 portas AND, com os 5 fios de entrada de cada uma. */
const portas = computed(() =>
  Array.from({ length: 16 }, (_, i) => {
    const y = Y0 + i * PASSO_PORTA
    const ys = pontosDeEntrada(y, ALTURA_PORTA, 5)
    // Entrada 0 a 3: bit direto se o bit de i é 1, invertido se é 0. Entrada 4: EN.
    const fios = [0, 1, 2, 3].map((bit) => {
      const trilho = trilhos.value[bit * 2 + ((i >> bit) & 1 ? 0 : 1)]!
      return { x: trilho.x, y: ys[bit]!, nivel: trilho.nivel }
    })
    fios.push({ x: X_EN, y: ys[4]!, nivel: props.habilita })
    return { i, y, fios, saida: saidas.value[i]! }
  }),
)

const descricao = computed(() => {
  const ativas = saidas.value.flatMap((n, i) => (n === 1 ? [HEX(i)] : []))
  return t('portas.descDecodificador', {
    entradas: [...props.entradas].reverse().join(''),
    en: props.habilita,
    saida: props.saida,
    ativas: ativas.length ? ativas.join(', ') : t('portas.nenhuma'),
  })
})
</script>

<template>
  <svg class="portas" :viewBox="`0 0 ${LARGURA} ${ALTURA}`" role="img" :aria-label="descricao">
    <!-- Trilhos verticais, com o nome e o valor no alto -->
    <g v-for="trilho in trilhos" :key="trilho.x">
      <line
        class="fio"
        :class="`nivel-${trilho.nivel}`"
        :x1="trilho.x"
        :y1="trilho.nome ? 26 : TOPO_TRILHOS"
        :x2="trilho.x"
        :y2="Y0 + 15 * PASSO_PORTA + ALTURA_PORTA"
      />
      <text v-if="trilho.nome" :x="trilho.x" y="12" text-anchor="middle" class="forte">
        {{ trilho.nome }}
      </text>
      <text v-if="trilho.nome" :x="trilho.x" y="23" text-anchor="middle" class="suave">
        {{ trilho.nivel }}
      </text>
    </g>

    <!-- NOT de cada bit: desvia do trilho direto e desce como o invertido -->
    <g v-for="bit in [0, 1, 2, 3]" :key="`not-${bit}`">
      <polyline
        class="fio"
        :class="`nivel-${entradas[bit]}`"
        :points="`${X0 + bit * PASSO_PAR},34 ${X0 + bit * PASSO_PAR + DISTANCIA_NEG},34 ${X0 + bit * PASSO_PAR + DISTANCIA_NEG},38`"
      />
      <circle
        class="ponto"
        :class="`nivel-${entradas[bit]}`"
        :cx="X0 + bit * PASSO_PAR"
        cy="34"
        r="2.5"
      />
      <path
        class="porta"
        :d="trianguloBaixo(X0 + bit * PASSO_PAR + DISTANCIA_NEG - 7, 38, 14, 14)"
      />
      <circle class="porta" :cx="X0 + bit * PASSO_PAR + DISTANCIA_NEG" :cy="55" r="3" />
    </g>

    <!-- 16 portas AND -->
    <g v-for="porta in portas" :key="porta.i">
      <template v-for="(fio, j) in porta.fios" :key="j">
        <line
          class="fio"
          :class="`nivel-${fio.nivel}`"
          :x1="fio.x"
          :y1="fio.y"
          :x2="X_PORTA"
          :y2="fio.y"
        />
        <circle class="ponto" :class="`nivel-${fio.nivel}`" :cx="fio.x" :cy="fio.y" r="2" />
      </template>
      <path
        class="porta"
        :class="`saida-${porta.saida}`"
        :d="formaE(X_PORTA, porta.y, LARGURA_PORTA, ALTURA_PORTA)"
      />
      <line
        class="fio"
        :class="`nivel-${porta.saida}`"
        :x1="X_PORTA + LARGURA_PORTA"
        :y1="porta.y + ALTURA_PORTA / 2"
        :x2="X_FIM"
        :y2="porta.y + ALTURA_PORTA / 2"
      />
      <text
        :x="X_FIM + 4"
        :y="porta.y + ALTURA_PORTA / 2 + 4"
        :class="porta.saida === 1 ? 'forte' : 'suave'"
      >
        {{ HEX(porta.i) }}={{ porta.saida }}
      </text>
    </g>
  </svg>
</template>
