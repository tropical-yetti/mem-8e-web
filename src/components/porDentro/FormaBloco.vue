<!--
  Contorno de um bloco (trapézio ou retângulo) desenhado atrás do conteúdo.
  O SVG estica para o tamanho do bloco, e o traço não engrossa ao esticar.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
/** Pontos do polígono num quadrado de 0 a 100. */
defineProps<{ pontos: string }>()
</script>

<template>
  <svg class="forma" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polygon :points="pontos" vector-effect="non-scaling-stroke" />
  </svg>
</template>

<style scoped>
.forma {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  z-index: 0;
}
polygon {
  fill: var(--fundo-painel);
  stroke: var(--texto-suave);
  stroke-width: 1.5;
}
</style>
