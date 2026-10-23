<!--
  O botão "Experimentos" e a janela com a lista (ADR 0005). Escolher um
  experimento fecha a janela e o guia, e o balão do experimento assume.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGuia } from '@/guia/guia'
import { EXPERIMENTOS, useExperimentos, type IdExperimento } from './experimentos'

const { t } = useI18n()
const guia = useGuia()
const experimentos = useExperimentos()
const janela = ref<HTMLDialogElement | null>(null)

function abrir() {
  janela.value?.showModal()
}

function escolher(id: IdExperimento) {
  janela.value?.close()
  if (guia.ativo.value) guia.fechar()
  experimentos.iniciar(id)
}
</script>

<template>
  <button type="button" class="abrir" data-guia="experimentos" @click="abrir">
    {{ t('experimentos.abrir') }}
  </button>

  <dialog ref="janela" class="janela" aria-labelledby="experimentos-titulo">
    <h2 id="experimentos-titulo">{{ t('experimentos.titulo') }}</h2>
    <p class="intro">{{ t('experimentos.intro') }}</p>
    <ul>
      <li v-for="e in EXPERIMENTOS" :key="e.id">
        <button type="button" class="item" @click="escolher(e.id)">
          <strong>{{ t(`experimentos.itens.${e.id}.titulo`) }}</strong>
          <span>{{ t(`experimentos.itens.${e.id}.resumo`) }}</span>
        </button>
      </li>
    </ul>
    <div class="acoes">
      <button type="button" class="fechar" @click="janela?.close()">
        {{ t('experimentos.fechar') }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.abrir {
  margin-top: 8px;
  padding: 4px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 999px;
  cursor: pointer;
}
.abrir:hover {
  background: var(--fundo-hover);
}
.janela {
  width: min(34rem, calc(100vw - 32px));
  padding: 16px 18px;
  color: var(--texto);
  background: var(--fundo-painel);
  border: 1px solid var(--borda);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
.janela::backdrop {
  background: rgba(0, 0, 0, 0.45);
}
h2 {
  margin: 0 0 6px;
  font-size: 1.1rem;
}
.intro {
  margin: 0 0 10px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--texto-suave);
}
ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  text-align: left;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 8px;
  cursor: pointer;
}
.item:hover {
  background: var(--fundo-hover);
  border-color: var(--destaque);
}
.item strong {
  font-size: 0.95rem;
}
.item span {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--texto-suave);
}
.acoes {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.fechar {
  padding: 4px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--texto);
  background: none;
  border: 1px solid var(--borda);
  border-radius: 6px;
  cursor: pointer;
}
.fechar:hover {
  background: var(--fundo-hover);
}
</style>
