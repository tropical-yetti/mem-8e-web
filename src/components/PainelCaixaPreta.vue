<!--
  Vista caixa-preta: a CPU (MAR, MDR e sinais de controle) à esquerda, os
  barramentos no meio e a memória com os seus pinos à direita. Cada linha da
  grade junta um registrador ou sinal, o fio dele e o pino da memória.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { colunaDe, linhaDe, paraHex, type Fios, type Nivel } from '@/core'
import { useSimuladorStore, type Sinal } from '@/stores/simulador'
import EditorRegistrador from './EditorRegistrador.vue'
import FioPainel from './FioPainel.vue'

const simulador = useSimuladorStore()
const { t } = useI18n()

/** Resumo de um barramento: Z se ninguém dirige, X se algum bit é indefinido. */
function resumo(fios: Fios): Nivel {
  if (fios.every((bit) => bit === 'Z')) return 'Z'
  return fios.some((bit) => bit === 'X' || bit === 'Z') ? 'X' : 1
}

const be = computed(() => simulador.avaliacao.be)
const bd = computed(() => simulador.avaliacao.bd)

const direcaoBd = computed(() => {
  const cpu = simulador.avaliacao.dadosCpu.some((bit) => bit !== 'Z')
  const memoria = simulador.avaliacao.dadosMemoria.some((bit) => bit !== 'Z')
  if (cpu && memoria) return 'ambos'
  return cpu ? 'cpu' : memoria ? 'memoria' : null
})

const marBits = computed<Nivel[]>(() => [...be.value])

const grupoMar = computed<[string, string]>(() => [
  t('painel.linha', { n: linhaDe(simulador.mar).toString(16).toUpperCase() }),
  t('painel.coluna', { n: colunaDe(simulador.mar).toString(16).toUpperCase() }),
])

const CONTROLES: { sinal: Exclude<Sinal, 'cpuDirigeDados'>; nome: string }[] = [
  { sinal: 'cs', nome: 'CS' },
  { sinal: 'rd', nome: 'RD' },
  { sinal: 'wr', nome: 'WR' },
]

/** Quem está dirigindo o BD, em texto. */
const quemDirige = computed(() =>
  t(`painel.dirige.${direcaoBd.value ?? 'ninguem'}`, { valor: paraHex(bd.value) }),
)
</script>

<template>
  <section class="painel" :aria-label="t('painel.titulo')">
    <!-- Cabeçalhos das colunas -->
    <h2 class="titulo-cpu">{{ t('painel.cpu') }}</h2>
    <h2 class="titulo-memoria">
      {{ t('painel.memoria') }}
      <span class="tamanho">256 × 8</span>
    </h2>

    <!-- Fundos dos dois blocos (atrás das células da grade) -->
    <div class="bloco bloco-cpu" aria-hidden="true"></div>
    <div class="bloco bloco-memoria" aria-hidden="true"></div>

    <!-- Área dos sinais (MDR → BD, CS, RD, WR e os fios), só para o guia apontar -->
    <div class="alvo-sinais" data-guia="sinais" aria-hidden="true"></div>

    <!-- MAR → BE -->
    <div class="cpu linha-be" data-guia="mar">
      <EditorRegistrador
        nome="MAR"
        prefixo="A"
        :bits="marBits"
        :grupos="grupoMar"
        @valor="simulador.mudarMar"
        @bit="simulador.alternarBitMar"
      />
    </div>
    <FioPainel
      class="fio linha-be"
      :nome="t('painel.be')"
      :nivel="resumo(be)"
      :valor="paraHex(be)"
      cor="be"
      largo
      direcao="cpu"
    />
    <div class="pino linha-be">A7–A0</div>

    <!-- MDR ↔ BD -->
    <div class="cpu linha-bd">
      <EditorRegistrador
        nome="MDR"
        prefixo="D"
        :bits="simulador.mdr"
        @valor="simulador.mudarMdr"
        @bit="simulador.alternarBitMdr"
      />
      <button
        type="button"
        class="chave"
        :aria-pressed="simulador.sinais.cpuDirigeDados === 1"
        @click="simulador.alternarSinal('cpuDirigeDados')"
      >
        <span class="led" :class="{ aceso: simulador.sinais.cpuDirigeDados }"></span>
        {{ t('painel.mdrNoBd') }}
      </button>
    </div>
    <FioPainel
      class="fio linha-bd"
      :nome="t('painel.bd')"
      :nivel="resumo(bd)"
      :valor="paraHex(bd)"
      cor="bd"
      largo
      :direcao="direcaoBd"
    />
    <div class="pino linha-bd">D7–D0</div>

    <!-- Sinais de controle -->
    <template v-for="(controle, i) in CONTROLES" :key="controle.sinal">
      <div class="cpu" :style="{ gridRow: 4 + i }">
        <button
          type="button"
          class="chave"
          :aria-pressed="simulador.sinais[controle.sinal] === 1"
          :aria-describedby="`dica-${controle.sinal}`"
          @click="simulador.alternarSinal(controle.sinal)"
        >
          <span class="led" :class="{ aceso: simulador.sinais[controle.sinal] }"></span>
          <span class="nome-sinal">{{ controle.nome }}</span>
          <span :id="`dica-${controle.sinal}`" class="dica">{{
            t(`painel.dicas.${controle.sinal}`)
          }}</span>
        </button>
      </div>
      <FioPainel
        class="fio"
        :style="{ gridRow: 4 + i }"
        :nome="controle.nome"
        :nivel="simulador.sinais[controle.sinal]"
        cor="controle"
        direcao="cpu"
      />
      <div class="pino" :style="{ gridRow: 4 + i }">{{ controle.nome }}</div>
    </template>

    <p class="visualmente-oculto" role="status">
      {{
        t('painel.resumo', {
          be: paraHex(be),
          bd: quemDirige,
          cs: simulador.sinais.cs,
          rd: simulador.sinais.rd,
          wr: simulador.sinais.wr,
        })
      }}
    </p>
  </section>
</template>

<style scoped>
.painel {
  display: grid;
  grid-template-columns: max-content minmax(3.5rem, 1fr) minmax(5.5rem, 8rem);
  grid-template-rows: auto auto auto repeat(3, 2.6rem) 0.75rem;
  column-gap: 0;
  row-gap: 10px;
  align-items: center;
}
h2 {
  margin: 0;
  padding: 8px 12px 0;
  font-size: 0.95rem;
  grid-row: 1;
  z-index: 1;
}
.titulo-cpu {
  grid-column: 1;
}
.titulo-memoria {
  grid-column: 3;
}
.bloco {
  grid-row: 1 / -1;
  align-self: stretch;
  border: 2px solid var(--borda);
  border-radius: 8px;
  background: var(--fundo-painel);
}
.bloco-cpu {
  grid-column: 1;
}
.bloco-memoria {
  grid-column: 3;
  background: var(--chip);
  border-color: var(--chip-borda);
}
.tamanho {
  display: block;
  font: 600 0.75rem var(--mono);
  opacity: 0.7;
}
.titulo-memoria {
  color: var(--chip-texto);
}
.alvo-sinais {
  grid-row: 3 / 7;
  grid-column: 1 / 3;
  align-self: stretch;
  visibility: hidden;
  pointer-events: none;
}
.cpu,
.pino,
.fio {
  z-index: 1;
}
.cpu {
  grid-column: 1;
  padding: 4px 12px;
}
.fio {
  grid-column: 2;
  align-self: stretch;
}
.pino {
  grid-column: 3;
  padding: 0 10px;
  font: 600 0.8rem var(--mono);
  color: var(--chip-texto);
}
.linha-be {
  grid-row: 2;
}
.linha-bd {
  grid-row: 3;
}
.linha-bd.cpu {
  display: grid;
  gap: 6px;
}

.chave {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 8px;
  font: inherit;
  font-size: 0.9rem;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 999px;
  cursor: pointer;
  justify-self: start;
}
.chave:hover {
  background: var(--fundo-hover);
}
.nome-sinal {
  font-weight: 700;
  min-width: 2ch;
}
.dica {
  font-size: 0.8rem;
  color: var(--texto-suave);
}
.led {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--fio-apagado);
  flex: none;
}
.led.aceso {
  background: var(--fio-controle);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fio-controle) 30%, transparent);
}

@media (max-width: 480px) {
  .painel {
    grid-template-columns: max-content minmax(2rem, 1fr) 4.1rem;
  }
  .cpu {
    padding: 4px 8px;
  }
  h2 {
    padding: 8px 8px 0;
  }
  .titulo-memoria {
    padding: 8px 5px 0;
    font-size: 0.78rem;
  }
  .dica {
    display: none;
  }
  .pino {
    padding: 0 6px;
    font-size: 0.68rem;
  }
}
</style>
