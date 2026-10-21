<!--
  Um fio (ou barramento) entre a CPU e a memória, desenhado no código dos
  4 níveis: 1 cheio na cor do fio, 0 fino e apagado, Z tracejado, X vermelho.
  As setas mostram quem está dirigindo.

  Só desenho: o estado é descrito em texto pelo painel, para leitores de tela.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { Nivel } from '@/core'

const props = defineProps<{
  nome: string
  /** Nível resumido: num barramento, `1` quer dizer "tem um valor definido". */
  nivel: Nivel
  /** Valor mostrado sobre o fio (por exemplo, "3A"). */
  valor?: string
  cor: 'be' | 'bd' | 'controle'
  largo?: boolean
  /** Quem dirige: a CPU (seta para a memória), a memória (seta para a CPU) ou os dois. */
  direcao?: 'cpu' | 'memoria' | 'ambos' | null
}>()

const classes = computed(() => [
  `cor-${props.cor}`,
  `nivel-${props.nivel}`,
  { largo: props.largo },
  props.direcao ? `de-${props.direcao}` : null,
])
</script>

<template>
  <div class="fio" :class="classes" aria-hidden="true">
    <span class="rotulo">
      <span class="nome">{{ nome }}</span>
      <span v-if="valor" class="valor">{{ valor }}</span>
    </span>
    <span class="linha"></span>
  </div>
</template>

<style scoped>
.fio {
  --cor: var(--fio-controle);
  --espessura: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  padding: 0 10px;
  color: var(--cor);
}
.fio.cor-be {
  --cor: var(--fio-be);
}
.fio.cor-bd {
  --cor: var(--fio-bd);
}
.fio.largo {
  --espessura: 10px;
}
.rotulo {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 4px;
  /* O texto fica mais escuro (ou mais claro) que o fio, para ser legível. */
  color: color-mix(in srgb, var(--cor) 40%, var(--texto));
}
.valor {
  font-family: var(--mono);
}
.linha {
  position: relative;
  display: block;
  height: var(--espessura);
  border-radius: 2px;
  background: var(--cor);
  transition:
    background-color 120ms,
    height 120ms;
}

/* 0: fino e apagado */
.fio.nivel-0 {
  --cor: var(--fio-apagado);
  color: var(--texto-suave);
}
.nivel-0 .linha {
  height: 2px;
}

/* Z: solto, tracejado */
.fio.nivel-Z {
  --cor: var(--fio-apagado);
  color: var(--texto-suave);
}
.nivel-Z .linha {
  height: 3px;
  background: repeating-linear-gradient(90deg, var(--fio-apagado) 0 7px, transparent 7px 13px);
}

/* X: indefinido ou em conflito */
.fio.nivel-X {
  --cor: var(--fio-x);
}
.nivel-X .linha {
  background: repeating-linear-gradient(
    -45deg,
    var(--fio-x) 0 6px,
    color-mix(in srgb, var(--fio-x) 45%, transparent) 6px 12px
  );
}

/* Setas: um triângulo na ponta para onde o dado vai. */
.de-cpu .linha::after,
.de-ambos .linha::after,
.de-memoria .linha::before,
.de-ambos .linha::before {
  content: '';
  position: absolute;
  top: 50%;
  border: calc(var(--espessura) / 2 + 6px) solid transparent;
  transform: translateY(-50%);
}
.de-cpu .linha::after,
.de-ambos .linha::after {
  right: -10px;
  border-left-color: var(--cor);
  border-right-width: 0;
}
.de-memoria .linha::before,
.de-ambos .linha::before {
  left: -10px;
  border-right-color: var(--cor);
  border-left-width: 0;
}
</style>
