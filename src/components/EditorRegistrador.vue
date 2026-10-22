<!--
  Um registrador de 8 bits editável: o valor em hexadecimal (digitado) e os
  8 bits como botões. Bits indefinidos (Z, X) aparecem como letras.

  `grupos` divide os bits em dois rótulos (por exemplo, "linha" e "coluna"
  para o MAR), para mostrar como o endereço se reparte na matriz.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { paraHex, type Nivel } from '@/core'

const props = defineProps<{
  nome: string
  /** Chave da legenda do registrador (siglas.<chave>). */
  sigla?: string
  /** Prefixo dos bits: "A" no MAR, "D" no MDR. */
  prefixo: string
  bits: readonly Nivel[]
  /** Rótulos dos 4 bits altos e dos 4 baixos, ou nada. */
  grupos?: [string, string]
}>()

const emit = defineEmits<{
  valor: [valor: number]
  bit: [bit: number]
}>()

const { t } = useI18n()

const hex = computed(() => paraHex(props.bits))
const texto = ref(hex.value)
watch(hex, (novo) => (texto.value = novo))

/** Bits do mais alto (7) ao mais baixo (0), como se escreve um número. */
const ordem = computed(() => props.bits.map((_, i) => props.bits.length - 1 - i))

function filtrar(evento: Event) {
  const campo = evento.target as HTMLInputElement
  texto.value = campo.value
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()
    .slice(0, 2)
  campo.value = texto.value
}

function confirmar() {
  if (texto.value === '') {
    texto.value = hex.value
    return
  }
  const valor = Number.parseInt(texto.value, 16)
  if (valor !== Number.parseInt(hex.value, 16)) emit('valor', valor)
  texto.value = paraHex(props.bits)
}

function descartar(evento: KeyboardEvent) {
  texto.value = hex.value
  ;(evento.target as HTMLInputElement).blur()
}

function rotuloBit(bit: number): string {
  return t('registrador.bit', { nome: `${props.prefixo}${bit}`, valor: String(props.bits[bit]) })
}
</script>

<template>
  <div class="registrador">
    <label class="cabeca" :data-sigla="sigla">
      <span class="nome">{{ nome }}</span>
      <input
        class="hex"
        :value="texto"
        inputmode="text"
        autocomplete="off"
        spellcheck="false"
        maxlength="2"
        :aria-label="t('registrador.valor', { nome })"
        @input="filtrar"
        @change="confirmar"
        @keydown.enter="confirmar"
        @keydown.esc="descartar"
      />
    </label>
    <div class="bits" role="group" :aria-label="t('registrador.bits', { nome })">
      <button
        v-for="bit in ordem"
        :key="bit"
        type="button"
        class="bit"
        :class="`nivel-${bits[bit]}`"
        :aria-pressed="bits[bit] === 1"
        :aria-label="rotuloBit(bit)"
        :title="`${prefixo}${bit}`"
        @click="emit('bit', bit)"
      >
        {{ bits[bit] }}
      </button>
    </div>
    <div v-if="grupos" class="grupos" aria-hidden="true">
      <span>{{ grupos[0] }}</span>
      <span>{{ grupos[1] }}</span>
    </div>
  </div>
</template>

<style scoped>
.registrador {
  display: grid;
  gap: 4px;
}
.cabeca {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.nome {
  font-weight: 700;
  min-width: 2.6em;
}
.hex {
  width: 3ch;
  box-sizing: content-box;
  padding: 2px 6px;
  font: 700 1.35rem/1.2 var(--mono);
  text-transform: uppercase;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 4px;
}
.bits {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 6px repeat(4, 1fr);
  gap: 2px;
}
/* O espaço entre os dois grupos de 4 bits (um dígito hexadecimal cada). */
.bit:nth-child(5) {
  grid-column: 6;
}
.bit {
  min-width: 24px;
  height: 1.75rem;
  padding: 0;
  font: 600 0.85rem/1 var(--mono);
  color: var(--texto-suave);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 3px;
  cursor: pointer;
}
@media (max-width: 480px) {
  .bit {
    height: 1.6rem;
    font-size: 0.78rem;
  }
}
.bit:hover {
  background: var(--fundo-hover);
}
.bit.nivel-1 {
  color: var(--fundo);
  background: var(--texto);
  border-color: var(--texto);
}
.bit.nivel-X {
  color: var(--fio-x);
  border-color: var(--fio-x);
}
.bit.nivel-Z {
  border-style: dashed;
}
.grupos {
  display: grid;
  grid-template-columns: 1fr 6px 1fr;
  font-size: 0.75rem;
  color: var(--texto-suave);
  text-align: center;
}
.grupos span:last-child {
  grid-column: 3;
}
</style>
