<!--
  Um traço curto que liga um bloco à grade, no código dos 4 níveis
  (1 aceso, 0 apagado, Z tracejado, X vermelho). Só desenho.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import type { Nivel } from '@/core'

defineProps<{ nivel: Nivel; direcao: 'vertical' | 'horizontal' }>()
</script>

<template>
  <span class="traco" :class="[direcao, `nivel-${nivel}`]" aria-hidden="true"></span>
</template>

<style scoped>
.traco {
  --cor: var(--fio-bd);
  display: block;
  justify-self: center;
  align-self: center;
  background: var(--cor);
  border-radius: 1px;
  transition: background-color 120ms;
}
.vertical {
  width: 3px;
  height: 100%;
}
.horizontal {
  width: 100%;
  height: 3px;
}
.nivel-0 {
  --cor: var(--fio-apagado);
}
.vertical.nivel-0 {
  width: 1px;
}
.horizontal.nivel-0 {
  height: 1px;
}
.nivel-X {
  --cor: var(--fio-x);
}
.nivel-Z.vertical {
  background: repeating-linear-gradient(180deg, var(--fio-apagado) 0 4px, transparent 4px 7px);
}
.nivel-Z.horizontal {
  background: repeating-linear-gradient(90deg, var(--fio-apagado) 0 4px, transparent 4px 7px);
}
</style>
