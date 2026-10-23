<!--
  O balão do guia de primeiro acesso e da ajuda contextual. A posição, o
  destaque e o foco ficam em BalaoBase; aqui ficam os textos e os botões.

  O foco vai para o balão ao abrir e volta para onde estava ao fechar; Esc
  fecha.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BalaoBase from './BalaoBase.vue'
import { useGuia } from './guia'
import './balao.css'

const { t, te } = useI18n()
const guia = useGuia()

const ultimo = computed(() => guia.indice.value === guia.total - 1)
</script>

<template>
  <BalaoBase
    v-if="guia.ativo.value && guia.passo.value"
    :alvo="guia.passo.value.alvo"
    :chave="guia.indice.value!"
    rotulo="guia-titulo"
    descricao="guia-texto"
    @fechar="guia.fechar()"
  >
    <template #default="{ irParaAlvo }">
      <p v-if="!guia.unico.value" class="contador">
        {{ t('guia.contador', { n: guia.indice.value! + 1, total: guia.total }) }}
      </p>
      <h2 id="guia-titulo" tabindex="-1" data-foco>
        {{ t(`guia.passos.${guia.passo.value.id}.titulo`) }}
      </h2>
      <p id="guia-texto" class="texto">{{ t(`guia.passos.${guia.passo.value.id}.texto`) }}</p>
      <p v-if="te(`guia.passos.${guia.passo.value.id}.experimente`)" class="experimente">
        <strong>{{ t('guia.experimente') }}</strong>
        {{ t(`guia.passos.${guia.passo.value.id}.experimente`) }}
      </p>

      <p v-if="guia.passo.value.doc" class="mais">
        <RouterLink :to="`/documentacao/${guia.passo.value.doc}`" @click="guia.fechar()">
          {{ t('guia.lerMais') }}
        </RouterLink>
      </p>

      <p v-if="guia.passo.value.alvo && !guia.unico.value" class="ir">
        <button type="button" class="ir-para" aria-keyshortcuts="F6" @click="irParaAlvo()">
          {{ t('guia.irPara') }}
        </button>
      </p>

      <div class="botoes">
        <template v-if="guia.unico.value">
          <button type="button" class="principal" @click="guia.fechar()">
            {{ t('guia.entendi') }}
          </button>
        </template>
        <template v-else>
          <button type="button" class="pular" @click="guia.fechar()">
            {{ ultimo ? t('guia.fechar') : t('guia.pular') }}
          </button>
          <span class="espaco"></span>
          <button v-if="guia.indice.value! > 0" type="button" @click="guia.anterior()">
            {{ t('guia.voltar') }}
          </button>
          <button type="button" class="principal" @click="guia.proximo()">
            {{ ultimo ? t('guia.concluir') : t('guia.proximo') }}
          </button>
        </template>
      </div>
    </template>
  </BalaoBase>
</template>
