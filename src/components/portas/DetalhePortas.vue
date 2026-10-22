<!--
  Detalhe em portas lógicas de um bloco da memória: o decodificador de
  linha, o de coluna, ou um bit da posição do MAR (célula, linha de bit,
  seletor e buffer). Os desenhos acompanham o estado do sistema ao vivo.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSimuladorStore } from '@/stores/simulador'
import PortasCelula from './PortasCelula.vue'
import PortasDecodificador from './PortasDecodificador.vue'

const simulador = useSimuladorStore()
const { t } = useI18n()

type Aba = 'celula' | 'linha' | 'coluna'
const ABAS: Aba[] = ['celula', 'linha', 'coluna']
const aba = ref<Aba>('celula')
const bit = ref(0)

const interno = computed(() => simulador.avaliacao.interno)
const endereco = computed(() => simulador.mar.toString(16).toUpperCase().padStart(2, '0'))

/** Setas esquerda/direita trocam de aba, como pede o padrão de abas do WAI-ARIA. */
function teclaAba(evento: KeyboardEvent) {
  const i = ABAS.indexOf(aba.value)
  const passo = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0
  if (!passo) return
  evento.preventDefault()
  aba.value = ABAS[(i + passo + ABAS.length) % ABAS.length]!
  document.getElementById(`aba-${aba.value}`)?.focus()
}
</script>

<template>
  <section class="detalhe" aria-labelledby="titulo-detalhe">
    <h2 id="titulo-detalhe">{{ t('portas.titulo') }}</h2>
    <div class="abas" role="tablist" :aria-label="t('portas.titulo')" @keydown="teclaAba">
      <button
        v-for="opcao in ABAS"
        :id="`aba-${opcao}`"
        :key="opcao"
        type="button"
        role="tab"
        :aria-selected="aba === opcao"
        :aria-controls="`painel-${opcao}`"
        :tabindex="aba === opcao ? 0 : -1"
        @click="aba = opcao"
      >
        {{ t(`portas.abas.${opcao}`, { endereco }) }}
      </button>
    </div>

    <div :id="`painel-${aba}`" class="painel" role="tabpanel" :aria-labelledby="`aba-${aba}`">
      <template v-if="aba === 'celula'">
        <div class="bits" role="group" :aria-label="t('portas.escolherBit')">
          <span>{{ t('portas.bit') }}</span>
          <button
            v-for="b in [7, 6, 5, 4, 3, 2, 1, 0]"
            :key="b"
            type="button"
            :aria-pressed="bit === b"
            @click="bit = b"
          >
            D{{ b }}
          </button>
        </div>
        <p class="explica">{{ t('portas.explicaCelula', { endereco, bit }) }}</p>
        <PortasCelula
          :endereco="simulador.mar"
          :bit="bit"
          :celulas="simulador.celulas"
          :interno="interno"
          :bd="simulador.avaliacao.bd"
          :cs="simulador.sinais.cs"
          :rd="simulador.sinais.rd"
          :wr="simulador.sinais.wr"
        />
      </template>
      <template v-else>
        <p class="explica">{{ t('portas.explicaDecodificador') }}</p>
        <PortasDecodificador
          v-if="aba === 'linha'"
          :nomes="['A4', 'A5', 'A6', 'A7']"
          :entradas="interno.enderecoLinha"
          :habilita="simulador.sinais.cs"
          :saida="t('portas.saidaLinha')"
        />
        <PortasDecodificador
          v-else
          :nomes="['A0', 'A1', 'A2', 'A3']"
          :entradas="interno.enderecoColuna"
          :habilita="simulador.sinais.cs"
          :saida="t('portas.saidaColuna')"
        />
      </template>
    </div>
  </section>
</template>

<style src="./portas.css"></style>

<style scoped>
.detalhe {
  display: grid;
  gap: 8px;
}
h2 {
  margin: 0;
  font-size: 0.95rem;
}
.abas {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--borda);
}
.abas button {
  padding: 6px 12px;
  margin-bottom: -1px;
  font: inherit;
  font-size: 0.88rem;
  color: var(--texto-suave);
  background: none;
  border: 1px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
}
.abas button[aria-selected='true'] {
  color: var(--texto);
  font-weight: 600;
  background: var(--fundo-painel);
  border-color: var(--borda);
  border-bottom-color: var(--fundo-painel);
}
.painel {
  display: grid;
  gap: 8px;
  padding: 10px 12px 12px;
  background: var(--fundo-painel);
  border: 1px solid var(--borda);
  border-top: 0;
  border-radius: 0 0 8px 8px;
}
.bits {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
}
.bits span {
  margin-right: 4px;
  color: var(--texto-suave);
}
.bits button {
  min-width: 2.2rem;
  min-height: 26px;
  padding: 2px 6px;
  font: 600 0.8rem var(--mono);
  color: var(--texto-suave);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 4px;
  cursor: pointer;
}
.bits button[aria-pressed='true'] {
  color: var(--fundo);
  background: var(--texto);
  border-color: var(--texto);
}
.explica {
  margin: 0;
  font-size: 0.85rem;
  color: var(--texto-suave);
  max-width: 68ch;
}
</style>
