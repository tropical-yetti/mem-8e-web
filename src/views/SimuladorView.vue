<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { URL_CODIGO_FONTE } from '@/config'

const { t, tm, rt } = useI18n()
const VERSAO = __VERSAO__

/** Lista de etapas vinda das mensagens (cada item é traduzido). */
const etapas = (): string[] =>
  (tm('simulador.etapas') as unknown[]).map((item) => rt(item as never))
</script>

<template>
  <section class="em-construcao">
    <h1>{{ t('simulador.titulo') }}</h1>
    <p>{{ t('simulador.descricao') }}</p>
    <p class="aviso" role="status">{{ t('simulador.emConstrucao', { versao: VERSAO }) }}</p>
    <h2>{{ t('simulador.proximos') }}</h2>
    <ol>
      <li v-for="etapa in etapas()" :key="etapa">{{ etapa }}</li>
    </ol>
    <p>
      <a :href="`${URL_CODIGO_FONTE}/blob/main/docs/PLANO.md`" target="_blank" rel="noopener">{{
        t('simulador.lerPlano')
      }}</a>
    </p>
  </section>
</template>

<style scoped>
.em-construcao {
  max-width: 72ch;
}
.aviso {
  padding: 8px 12px;
  border: 1px solid var(--borda);
  border-left: 4px solid var(--destaque);
  border-radius: 4px;
  background: var(--fundo-painel);
}
</style>
