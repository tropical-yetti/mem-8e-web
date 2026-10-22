<!--
  Tabela das siglas, gerada das mesmas mensagens das legendas (siglas.* nos
  arquivos de tradução): uma só fonte para a legenda e para a documentação.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/** Ordem da tabela: do lado da CPU para dentro da memória e, por fim, o tempo. */
const SIGLAS = [
  'mar',
  'mdr',
  'be',
  'bd',
  'mdrBd',
  'cs',
  'rd',
  'wr',
  'pinosA',
  'pinosD',
  'clk',
  'ready',
]
</script>

<template>
  <div class="tabela-rolavel" tabindex="0">
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t('docs.sigla') }}</th>
          <th scope="col">{{ t('docs.significado') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sigla in SIGLAS" :id="`sigla-${sigla}`" :key="sigla">
          <th scope="row">
            <code>{{ t(`siglas.${sigla}.sigla`) }}</code>
          </th>
          <td>{{ t(`siglas.${sigla}.nome`) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
