<!--
  Decodificador de coluna 4 → 16, desenhado acima da matriz: recebe A3–A0
  e o CS, e liga uma das 16 saídas, cada uma descendo para a sua coluna.

  As medidas vêm de --cel-l (largura de uma célula da grade), para que cada
  saída caia exatamente sobre a sua coluna.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { paraHex, type Nivel } from '@/core'
import FormaBloco from './FormaBloco.vue'
import TracoNivel from './TracoNivel.vue'

const props = defineProps<{
  entradas: readonly Nivel[]
  habilita: Nivel
  saidas: readonly Nivel[]
}>()
const { t } = useI18n()

/** A3 A2 A1 A0, do bit mais alto ao mais baixo. */
const bits = computed(() => [...props.entradas].reverse().join(''))
</script>

<template>
  <div class="decodificador">
    <div class="caixa" :class="{ desligado: habilita !== 1 }">
      <FormaBloco pontos="5,0 95,0 100,100 0,100" />
      <span class="entrada">A3–A0 = {{ bits }} ({{ paraHex(entradas) }})</span>
      <span class="nome">{{ t('porDentro.decColuna') }}</span>
      <span class="en" :class="`nivel-${habilita}`">EN = CS = {{ habilita }}</span>
    </div>
    <div class="saidas">
      <TracoNivel v-for="(nivel, i) in saidas" :key="i" :nivel="nivel" direcao="vertical" />
    </div>
  </div>
</template>

<style scoped>
.decodificador {
  display: grid;
  gap: 0;
  padding-left: calc(var(--cel-l) + 1px);
}
.caixa {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 2px 10px;
  padding: 6px 7% 8px;
  font-size: 0.78rem;
  color: var(--texto);
  position: relative;
}
.caixa.desligado {
  color: var(--texto-suave);
}
.caixa > span {
  position: relative;
  z-index: 1;
}
.nome {
  font-weight: 700;
}
.entrada,
.en {
  font-family: var(--mono);
}
.en.nivel-1 {
  color: color-mix(in srgb, var(--fio-controle) 45%, var(--texto));
  font-weight: 700;
}
.saidas {
  display: grid;
  grid-template-columns: repeat(16, var(--cel-l));
  height: 14px;
}
</style>
