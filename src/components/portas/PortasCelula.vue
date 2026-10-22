<!--
  Um bit de uma posição da memória, em portas lógicas, do jeito que o núcleo
  o calcula (ADR 0001):

  Escrita: AND(CS, WR, linha, coluna) libera o latch, que copia o bit do BD.
  Leitura: AND(linha, Q) põe o bit na linha de bit da coluna (um OR com as
  outras linhas); AND(coluna, linha de bit) passa pelo seletor (um OR com as
  outras colunas); o buffer tri-state, ligado por AND(CS, RD), põe o
  resultado no BD.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  colunaDe,
  COLUNAS,
  e,
  enderecoDe,
  linhaDe,
  LINHAS,
  ou,
  type EstadoInterno,
  type Fios,
  type Nivel,
} from '@/core'
import { entradas, formaE, formaOu, trianguloDireita } from './formas'

const props = defineProps<{
  endereco: number
  bit: number
  celulas: readonly (readonly Nivel[])[]
  interno: EstadoInterno
  bd: Fios
  cs: Nivel
  rd: Nivel
  wr: Nivel
}>()

const { t } = useI18n()
const HEX = (n: number) => n.toString(16).toUpperCase()

const v = computed(() => {
  const r = linhaDe(props.endereco)
  const c = colunaDe(props.endereco)
  const b = props.bit
  const linha = props.interno.linhas[r]!
  const coluna = props.interno.colunas[c]!
  const q = props.celulas[props.endereco]![b]!
  const outrasLinhas = ou(
    ...Array.from({ length: LINHAS }, (_, rr) =>
      rr === r ? 0 : e(props.interno.linhas[rr]!, props.celulas[enderecoDe(rr, c)]![b]!),
    ),
  )
  const outrasColunas = ou(
    ...Array.from({ length: COLUNAS }, (_, cc) =>
      cc === c ? 0 : e(props.interno.colunas[cc]!, props.interno.linhasDeBit[cc]![b]!),
    ),
  )
  return {
    r: HEX(r),
    c: HEX(c),
    linha,
    coluna,
    q,
    dado: props.bd[b]!,
    libera: e(props.cs, props.wr, linha, coluna),
    palavra: e(linha, q),
    outrasLinhas,
    linhaDeBit: props.interno.linhasDeBit[c]![b]!,
    naColuna: e(coluna, props.interno.linhasDeBit[c]![b]!),
    outrasColunas,
    seletor: props.interno.saidaSeletor[b]!,
    habilitaSaida: props.interno.habilitaSaida,
    saida: props.interno.saida[b]!,
  }
})

const fio = (nivel: Nivel) => `fio nivel-${nivel}`

// Geometria (coordenadas do viewBox)
const E4 = { x: 74, y: 12, l: 34, a: 60 }
const ENT4 = entradas(E4.y, E4.a, 4)
const LATCH = { x: 168, y: 26, l: 78, a: 82 }
const Y_EN = 42
const Y_D = 92
const Y_Q = 67
const EP = { x: 296, y: 56, l: 30, a: 30 }
const ENT_P = entradas(EP.y, EP.a, 2)
const OL = { x: 366, y: 56, l: 32, a: 36 }
const ENT_OL = entradas(OL.y, OL.a, 2)
const Y_VOLTA = 146
const EC = { x: 88, y: 168, l: 30, a: 30 }
const ENT_C = entradas(EC.y, EC.a, 2)
const OC = { x: 158, y: 166, l: 32, a: 36 }
const ENT_OC = entradas(OC.y, OC.a, 2)
const TS = { x: 290, y: 170, l: 28, a: 30 }
const ER = { x: 236, y: 222, l: 30, a: 28 }
const ENT_R = entradas(ER.y, ER.a, 2)

const descricao = computed(() =>
  t('portas.descCelula', {
    endereco: HEX(props.endereco).padStart(2, '0'),
    bit: props.bit,
    q: v.value.q,
    libera: v.value.libera,
    saida: v.value.saida,
  }),
)
</script>

<template>
  <svg class="portas" viewBox="0 0 470 268" role="img" :aria-label="descricao">
    <!-- ===== Escrita: AND de 4 entradas libera o latch ===== -->
    <text x="2" y="8" class="suave">{{ t('portas.escrita') }}</text>
    <g
      v-for="(sinal, i) in [
        { nome: 'CS', nivel: cs },
        { nome: 'WR', nivel: wr },
        { nome: t('portas.lin', { n: v.r }), nivel: v.linha },
        { nome: t('portas.col', { n: v.c }), nivel: v.coluna },
      ]"
      :key="sinal.nome"
    >
      <text x="2" :y="ENT4[i]! + 4">{{ sinal.nome }}={{ sinal.nivel }}</text>
      <line :class="fio(sinal.nivel)" x1="54" :y1="ENT4[i]" :x2="E4.x" :y2="ENT4[i]" />
    </g>
    <path class="porta" :class="`saida-${v.libera}`" :d="formaE(E4.x, E4.y, E4.l, E4.a)" />
    <polyline
      :class="fio(v.libera)"
      :points="`${E4.x + E4.l},${E4.y + E4.a / 2} ${140},${E4.y + E4.a / 2} 140,${Y_EN} ${LATCH.x},${Y_EN}`"
    />

    <text x="2" :y="Y_D + 4">D{{ bit }}={{ v.dado }}</text>
    <line :class="fio(v.dado)" x1="54" :y1="Y_D" :x2="LATCH.x" :y2="Y_D" />
    <text x="58" :y="Y_D - 5" class="suave">BD</text>

    <rect class="bloco" :x="LATCH.x" :y="LATCH.y" :width="LATCH.l" :height="LATCH.a" rx="3" />
    <text :x="LATCH.x + 5" :y="Y_EN + 4">EN</text>
    <text :x="LATCH.x + 5" :y="Y_D + 4">D</text>
    <text :x="LATCH.x + LATCH.l - 5" :y="Y_Q + 4" text-anchor="end">Q</text>
    <text :x="LATCH.x + LATCH.l / 2" :y="LATCH.y + LATCH.a + 14" text-anchor="middle" class="suave">
      {{ t('portas.latch') }}
    </text>
    <text :x="LATCH.x + LATCH.l / 2" :y="Y_Q + 4" text-anchor="middle" class="forte">
      {{ v.q }}
    </text>

    <!-- ===== Leitura: linha de palavra · Q vai para a linha de bit ===== -->
    <line :class="fio(v.q)" :x1="LATCH.x + LATCH.l" :y1="Y_Q" :x2="EP.x" :y2="ENT_P[0]" />
    <text :x="EP.x - 4" :y="ENT_P[1]! + 15" text-anchor="end">
      {{ t('portas.lin', { n: v.r }) }}
    </text>
    <line :class="fio(v.linha)" :x1="EP.x - 20" :y1="ENT_P[1]" :x2="EP.x" :y2="ENT_P[1]" />
    <path class="porta" :class="`saida-${v.palavra}`" :d="formaE(EP.x, EP.y, EP.l, EP.a)" />
    <line
      :class="fio(v.palavra)"
      :x1="EP.x + EP.l"
      :y1="EP.y + EP.a / 2"
      :x2="OL.x + 6"
      :y2="ENT_OL[0]"
    />
    <line
      :class="fio(v.outrasLinhas)"
      :x1="OL.x - 22"
      :y1="ENT_OL[1]"
      :x2="OL.x + 6"
      :y2="ENT_OL[1]"
    />
    <text :x="OL.x - 24" :y="ENT_OL[1]! + 17" class="suave">{{ t('portas.outrasLinhas') }}</text>
    <path class="porta" :class="`saida-${v.linhaDeBit}`" :d="formaOu(OL.x, OL.y, OL.l, OL.a)" />
    <polyline
      :class="fio(v.linhaDeBit)"
      :points="`${OL.x + OL.l},${OL.y + OL.a / 2} 440,${OL.y + OL.a / 2} 440,${Y_VOLTA} 60,${Y_VOLTA} 60,${ENT_C[0]} ${EC.x},${ENT_C[0]}`"
    />
    <text x="250" :y="Y_VOLTA - 6" text-anchor="middle">
      {{ t('portas.linhaDeBit', { c: v.c, bit }) }} = {{ v.linhaDeBit }}
    </text>

    <!-- ===== Seletor de coluna e buffer de saída ===== -->
    <text x="2" :y="ENT_C[1]! + 4">{{ t('portas.col', { n: v.c }) }}</text>
    <line :class="fio(v.coluna)" x1="40" :y1="ENT_C[1]" :x2="EC.x" :y2="ENT_C[1]" />
    <path class="porta" :class="`saida-${v.naColuna}`" :d="formaE(EC.x, EC.y, EC.l, EC.a)" />
    <line
      :class="fio(v.naColuna)"
      :x1="EC.x + EC.l"
      :y1="EC.y + EC.a / 2"
      :x2="OC.x + 6"
      :y2="ENT_OC[0]"
    />
    <line
      :class="fio(v.outrasColunas)"
      :x1="OC.x - 22"
      :y1="ENT_OC[1]"
      :x2="OC.x + 6"
      :y2="ENT_OC[1]"
    />
    <text :x="OC.x - 24" :y="ENT_OC[1]! + 17" class="suave">{{ t('portas.outrasColunas') }}</text>
    <path class="porta" :class="`saida-${v.seletor}`" :d="formaOu(OC.x, OC.y, OC.l, OC.a)" />
    <line
      :class="fio(v.seletor)"
      :x1="OC.x + OC.l"
      :y1="OC.y + OC.a / 2"
      :x2="TS.x"
      :y2="TS.y + TS.a / 2"
    />
    <text :x="OC.x + OC.l / 2" :y="OC.y - 6" text-anchor="middle" class="suave">
      {{ t('portas.seletor') }}
    </text>

    <text :x="ER.x - 18" :y="ENT_R[0]! + 4" text-anchor="end">CS={{ cs }}</text>
    <text :x="ER.x - 18" :y="ENT_R[1]! + 4" text-anchor="end">RD={{ rd }}</text>
    <line :class="fio(cs)" :x1="ER.x - 14" :y1="ENT_R[0]" :x2="ER.x" :y2="ENT_R[0]" />
    <line :class="fio(rd)" :x1="ER.x - 14" :y1="ENT_R[1]" :x2="ER.x" :y2="ENT_R[1]" />
    <path class="porta" :class="`saida-${v.habilitaSaida}`" :d="formaE(ER.x, ER.y, ER.l, ER.a)" />
    <polyline
      :class="fio(v.habilitaSaida)"
      :points="`${ER.x + ER.l},${ER.y + ER.a / 2} ${TS.x + TS.l / 2},${ER.y + ER.a / 2} ${TS.x + TS.l / 2},${TS.y + TS.a * 0.75}`"
    />
    <path class="porta" :class="`saida-${v.saida}`" :d="trianguloDireita(TS.x, TS.y, TS.l, TS.a)" />
    <text :x="TS.x + TS.l / 2" :y="TS.y - 6" text-anchor="middle" class="suave">tri-state</text>
    <line
      :class="fio(v.saida)"
      :x1="TS.x + TS.l"
      :y1="TS.y + TS.a / 2"
      x2="400"
      :y2="TS.y + TS.a / 2"
    />
    <text x="404" :y="TS.y + TS.a / 2 + 4" class="forte">D{{ bit }}={{ v.saida }}</text>
    <text x="404" :y="TS.y + TS.a / 2 + 18" class="suave">→ BD</text>
  </svg>
</template>
