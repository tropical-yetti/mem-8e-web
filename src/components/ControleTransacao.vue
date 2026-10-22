<!--
  Leitura e escrita passo a passo: os botões, a lista de fases (uma
  sequência de verdade, por isso numerada) e a explicação da fase atual.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { colunaDe, linhaDe, paraHex } from '@/core'
import { useSimuladorStore } from '@/stores/simulador'

const simulador = useSimuladorStore()
const { t } = useI18n()

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0')

const fases = computed(() => simulador.fases)
const faseAtual = computed(() => {
  const f = fases.value
  return f && f.indice >= 0 ? f.lista[f.indice]! : null
})

/** Valores que aparecem nas explicações. */
const valores = computed(() => ({
  endereco: hex2(simulador.mar),
  linha: linhaDe(simulador.mar).toString(16).toUpperCase(),
  coluna: colunaDe(simulador.mar).toString(16).toUpperCase(),
  dado: fases.value?.tipo === 'ler' ? paraHex(simulador.avaliacao.bd) : paraHex(simulador.mdr),
  mdr: paraHex(simulador.mdr),
  n: t('tempo.ciclos', simulador.linhaDoTempo.esperas),
  twp: simulador.tempo.tWP,
  periodo: simulador.tempo.periodo,
}))

/** A transação vai dar errado por causa do tempo (CPU que não espera uma memória lenta). */
const errada = computed(() => !simulador.linhaDoTempo.certo)

/** Fases cujo texto muda quando a transação dá errado. */
const FASES_QUE_ERRAM = ['captura', 'fimEscrita']

const explicacao = computed(() => {
  const f = fases.value
  if (!f || !faseAtual.value) return t('transacao.inicio')
  const variante =
    errada.value && FASES_QUE_ERRAM.includes(faseAtual.value) ? 'textoErrado' : 'texto'
  return t(`transacao.${f.tipo}.${faseAtual.value}.${variante}`, valores.value)
})

const resultado = computed(() => {
  const f = fases.value
  if (!f?.terminou) return null
  return t(`transacao.${f.tipo}.${errada.value ? 'fimErrado' : 'fim'}`, valores.value)
})
</script>

<template>
  <section class="transacao" aria-labelledby="titulo-transacao">
    <h2 id="titulo-transacao">{{ t('transacao.titulo') }}</h2>

    <div class="botoes">
      <template v-if="!fases || fases.terminou">
        <button type="button" class="principal" @click="simulador.iniciarLeitura()">
          {{ t('transacao.lerBotao', { endereco: valores.endereco }) }}
        </button>
        <button
          type="button"
          class="principal"
          :disabled="!simulador.podeEscrever"
          :aria-describedby="simulador.podeEscrever ? undefined : 'aviso-escrever'"
          @click="simulador.iniciarEscrita()"
        >
          {{ t('transacao.escreverBotao', { dado: valores.mdr, endereco: valores.endereco }) }}
        </button>
        <span v-if="!simulador.podeEscrever" id="aviso-escrever" class="aviso">
          {{ t('transacao.mdrIndefinido') }}
        </span>
      </template>
      <template v-else>
        <button type="button" class="principal" @click="simulador.proximaFase()">
          {{ t('transacao.proxima') }}
        </button>
        <button type="button" @click="simulador.concluir()">{{ t('transacao.concluir') }}</button>
        <button type="button" @click="simulador.encerrar()">{{ t('transacao.encerrar') }}</button>
      </template>
    </div>

    <ol v-if="fases" class="fases" :aria-label="t(`transacao.${fases.tipo}.nome`)">
      <li
        v-for="(fase, i) in fases.lista"
        :key="fase"
        :class="{ feita: i < fases.indice, atual: i === fases.indice }"
        :aria-current="i === fases.indice ? 'step' : undefined"
      >
        {{ t(`transacao.${fases.tipo}.${fase}.nome`) }}
      </li>
    </ol>

    <p class="explicacao" aria-live="polite">
      {{ explicacao }}
      <strong v-if="resultado" class="resultado" :class="{ errado: errada }">{{
        resultado
      }}</strong>
    </p>
  </section>
</template>

<style scoped>
.transacao {
  display: grid;
  gap: 10px;
}
h2 {
  margin: 0;
  font-size: 0.95rem;
}
.botoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
button {
  padding: 6px 14px;
  font: inherit;
  font-size: 0.95rem;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 6px;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--fundo-hover);
}
button.principal {
  font-weight: 600;
  color: var(--sobre-destaque);
  background: var(--destaque);
  border-color: var(--destaque);
}
button.principal:hover:not(:disabled) {
  background: color-mix(in srgb, var(--destaque) 85%, #000000);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.aviso {
  font-size: 0.85rem;
  color: var(--texto-suave);
}
.fases {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: fase;
}
.fases li {
  counter-increment: fase;
  padding: 4px 10px 4px 6px;
  font-size: 0.85rem;
  color: var(--texto-suave);
  border: 1px solid var(--borda);
  border-radius: 999px;
}
.fases li::before {
  content: counter(fase);
  display: inline-grid;
  place-items: center;
  width: 1.3em;
  height: 1.3em;
  margin-right: 6px;
  font-size: 0.8em;
  font-weight: 700;
  border-radius: 50%;
  background: var(--fundo-cabecalho);
}
.fases li.feita {
  color: var(--texto);
}
.fases li.atual {
  color: var(--texto);
  font-weight: 600;
  border-color: var(--destaque);
  box-shadow: inset 0 0 0 1px var(--destaque);
}
.fases li.atual::before {
  color: var(--sobre-destaque);
  background: var(--destaque);
}
.explicacao {
  margin: 0;
  max-width: 68ch;
  min-height: 3em;
}
.resultado {
  display: block;
  margin-top: 4px;
}
.resultado.errado {
  color: var(--fio-x);
}
</style>
