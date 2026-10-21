<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { I18nT, useI18n } from 'vue-i18n'
import {
  AUTOR_CPU8E,
  URL_CODIGO_FONTE,
  URL_CPU8E_ORIGINAL,
  URL_CPU8E_WEB,
  URL_LICENCA,
} from '@/config'

const { t } = useI18n()
const VERSAO = __VERSAO__
</script>

<template>
  <article class="sobre">
    <h1>{{ t('sobre.titulo') }}</h1>
    <p>{{ t('sobre.historia') }}</p>

    <h2>{{ t('sobre.familiaTitulo') }}</h2>
    <I18nT keypath="sobre.familia" tag="p" scope="global">
      <template #cpu8eWeb>
        <a :href="URL_CPU8E_WEB" target="_blank" rel="noopener">CPU-8E Web</a>
      </template>
      <template #cpu8e>
        <a :href="URL_CPU8E_ORIGINAL" target="_blank" rel="noopener">CPU-8E</a>
      </template>
      <template #autor>
        <a :href="AUTOR_CPU8E.lattes" target="_blank" rel="noopener">{{ AUTOR_CPU8E.nome }}</a>
      </template>
    </I18nT>

    <h2>{{ t('sobre.versaoTitulo') }}</h2>
    <p>{{ t('rodape.versao', { versao: VERSAO }) }}</p>
    <p>
      <a :href="URL_CODIGO_FONTE" target="_blank" rel="noopener">{{ t('rodape.codigoFonte') }}</a>
    </p>

    <h2>{{ t('sobre.licencaTitulo') }}</h2>
    <p>{{ t('sobre.licenca') }}</p>
    <p>{{ t('sobre.garantia') }}</p>
    <p>
      <a :href="URL_LICENCA" target="_blank" rel="noopener">{{ t('sobre.lerLicenca') }}</a>
    </p>
  </article>
</template>

<style scoped>
.sobre {
  max-width: 72ch;
}
</style>
