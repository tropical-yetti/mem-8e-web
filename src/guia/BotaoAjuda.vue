<!--
  Botão "?" ao lado do título de uma seção: abre o balão do guia só para
  aquela parte (ajuda contextual).

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useExperimentos } from '@/experimentos/experimentos'
import { useGuia, type IdPasso } from './guia'

const props = defineProps<{ passo: IdPasso }>()
const { t } = useI18n()
const guia = useGuia()
const experimentos = useExperimentos()

/** A ajuda de uma parte fecha o experimento em andamento, se houver. */
function abrir() {
  experimentos.sair()
  guia.ajuda(props.passo)
}
</script>

<template>
  <button
    type="button"
    class="ajuda"
    :aria-label="t('guia.ajudaDe', { parte: t(`guia.passos.${props.passo}.titulo`) })"
    :title="t('guia.ajuda')"
    @click="abrir"
  >
    ?
  </button>
</template>

<style scoped>
.ajuda {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  font:
    700 0.8rem/1 system-ui,
    sans-serif;
  color: var(--texto-suave);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 50%;
  cursor: pointer;
  vertical-align: middle;
}
.ajuda:hover {
  color: var(--texto);
  background: var(--fundo-hover);
}
</style>
