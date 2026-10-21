<!--
  Decodificador de linha 4 → 16, desenhado à esquerda da matriz: recebe
  A7–A4 e o CS, e liga uma das 16 linhas de palavra, cada uma entrando na
  sua linha da grade.

  As medidas vêm de --cel-a (altura de uma célula da grade).

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

/** A7 A6 A5 A4, do bit mais alto ao mais baixo. */
const bits = computed(() => [...props.entradas].reverse().join(''))
</script>

<template>
  <div class="decodificador">
    <div class="caixa" :class="{ desligado: habilita !== 1 }">
      <FormaBloco pontos="0,5 100,0 100,100 0,95" />
      <span class="nome vertical">{{ t('porDentro.decLinha') }}</span>
      <span class="entrada">A7–A4<br />{{ bits }}<br />({{ paraHex(entradas) }})</span>
      <span class="en" :class="`nivel-${habilita}`">EN<br />CS = {{ habilita }}</span>
    </div>
    <div class="saidas">
      <TracoNivel v-for="(nivel, i) in saidas" :key="i" :nivel="nivel" direcao="horizontal" />
    </div>
  </div>
</template>

<style scoped>
.decodificador {
  display: grid;
  grid-template-columns: auto 14px;
  /* Pula a linha de cabeçalho da grade e a borda dela. */
  padding-top: calc(var(--cel-a) + 1px);
}
.caixa {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 4.4rem;
  height: calc(16 * var(--cel-a));
  padding: 18px 4px;
  font-size: 0.74rem;
  line-height: 1.3;
  text-align: center;
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
/* O nome corre ao longo do bloco, de baixo para cima. */
.vertical {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
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
  grid-template-rows: repeat(16, var(--cel-a));
}
</style>
