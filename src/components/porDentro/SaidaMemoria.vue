<!--
  O caminho do dado abaixo da matriz:

  1. as linhas de bit levam os 16 bytes da linha ativa (a linha inteira é lida);
  2. o seletor de coluna, comandado pelo decodificador de coluna, escolhe um;
  3. os buffers tri-state, ligados por CS · RD, põem esse byte no BD.

  Ao lado fica a liberação da escrita (CS · WR), o caminho de volta do BD
  para a célula do cruzamento.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { paraHex, type EstadoInterno, type Fios, type Nivel } from '@/core'
import FormaBloco from './FormaBloco.vue'
import TracoNivel from './TracoNivel.vue'

const props = defineProps<{ interno: EstadoInterno; bd: Fios; cs: Nivel; rd: Nivel; wr: Nivel }>()
const { t } = useI18n()

/** Resumo de um grupo de fios: Z se todos soltos, X se algum indefinido, senão 1. */
function resumo(fios: Fios): Nivel {
  if (fios.every((bit) => bit === 'Z')) return 'Z'
  return fios.some((bit) => bit === 'X' || bit === 'Z') ? 'X' : 1
}

/** A linha de bit de uma coluna "conduz" quando alguma linha da matriz está ativa. */
const algumaLinha = computed(() => props.interno.linhas.some((nivel) => nivel !== 0))
const nivelSaida = computed(() => resumo(props.interno.saida))
</script>

<template>
  <div class="saida">
    <!-- 1. Linhas de bit: os 16 bytes da linha ativa -->
    <div class="linhas-de-bit">
      <span class="rotulo">{{ t('porDentro.linhasDeBit') }}</span>
      <span
        v-for="(bits, coluna) in interno.linhasDeBit"
        :key="coluna"
        class="byte"
        :class="{
          escolhida: interno.colunas[coluna] === 1,
          apagada: !algumaLinha,
          duvida: interno.colunas[coluna] === 'X',
        }"
        >{{ paraHex(bits) }}</span
      >
    </div>
    <div class="tracos">
      <TracoNivel
        v-for="(selecao, coluna) in interno.colunas"
        :key="coluna"
        :nivel="algumaLinha ? (selecao === 0 ? 0 : selecao) : 0"
        direcao="vertical"
      />
    </div>

    <!-- 2. Seletor de coluna -->
    <div class="bloco seletor">
      <FormaBloco pontos="0,0 100,0 92,100 8,100" />
      <span class="nome">{{ t('porDentro.seletor') }}</span>
      <span class="valor">{{
        t('porDentro.escolhe', { valor: paraHex(interno.saidaSeletor) })
      }}</span>
    </div>
    <div class="ligacao">
      <TracoNivel :nivel="resumo(interno.saidaSeletor)" direcao="vertical" />
    </div>

    <!-- 3. Buffers de saída -->
    <div class="bloco buffers">
      <FormaBloco pontos="0,0 100,0 100,100 0,100" />
      <span class="nome">{{ t('porDentro.buffers') }}</span>
      <span class="habilita" :class="`nivel-${interno.habilitaSaida}`"
        >CS · RD = {{ cs }} · {{ rd }} = {{ interno.habilitaSaida }}</span
      >
      <span class="valor">
        {{
          interno.habilitaSaida === 1
            ? t('porDentro.buffersLigados', { valor: paraHex(interno.saida) })
            : t('porDentro.buffersDesligados')
        }}
      </span>
    </div>
    <div class="ligacao"><TracoNivel :nivel="nivelSaida" direcao="vertical" /></div>
    <p class="destino">D7–D0 → BD = {{ paraHex(bd) }}</p>

    <!-- Escrita -->
    <p class="escrita" :class="`nivel-${interno.habilitaEscrita}`">
      <strong>CS · WR = {{ cs }} · {{ wr }} = {{ interno.habilitaEscrita }}</strong>
      {{
        interno.habilitaEscrita === 1
          ? t('porDentro.escritaLiberada', { valor: paraHex(bd) })
          : t('porDentro.escritaBloqueada')
      }}
    </p>
  </div>
</template>

<style scoped>
.saida {
  display: grid;
  justify-items: stretch;
  padding-left: 1px;
  font-size: 0.78rem;
}
.linhas-de-bit,
.tracos {
  display: grid;
  grid-template-columns: var(--cel-l) repeat(16, var(--cel-l));
}
.linhas-de-bit {
  margin-top: 4px;
  font-family: var(--mono);
  align-items: center;
}
.rotulo {
  grid-column: 1;
  font-family: system-ui, sans-serif;
  font-size: 0.62rem;
  line-height: 1;
  color: var(--texto-suave);
  text-align: center;
}
.byte {
  text-align: center;
  padding: 3px 0;
  color: var(--texto);
  border-bottom: 2px solid var(--fio-apagado);
}
.byte.apagada {
  color: var(--texto-suave);
}
.byte.escolhida {
  font-weight: 700;
  background: var(--mira-forte);
  border-bottom-color: var(--fio-bd);
}
.byte.duvida {
  color: var(--fio-x);
}
.tracos {
  height: 12px;
}
.tracos > :first-child {
  grid-column: 2;
}
.bloco {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  gap: 2px 12px;
  margin-left: var(--cel-l);
  padding: 7px 24px 9px;
  text-align: center;
}
.bloco > span {
  position: relative;
  z-index: 1;
}
.buffers {
  margin-left: calc(var(--cel-l) * 4);
  margin-right: calc(var(--cel-l) * 3);
}
.nome {
  font-weight: 700;
}
.valor,
.habilita,
.destino,
.escrita strong {
  font-family: var(--mono);
}
.habilita.nivel-1 {
  font-weight: 700;
  color: color-mix(in srgb, var(--fio-controle) 45%, var(--texto));
}
.ligacao {
  display: grid;
  height: 12px;
  margin-left: var(--cel-l);
}
.destino {
  margin: 0;
  margin-left: var(--cel-l);
  text-align: center;
  font-weight: 700;
  color: color-mix(in srgb, var(--fio-bd) 40%, var(--texto));
}
.escrita {
  margin: 12px 0 0;
  padding: 6px 10px;
  color: var(--texto-suave);
  border: 1px dashed var(--borda);
  border-radius: 6px;
}
.escrita.nivel-1 {
  color: var(--texto);
  border: 1px solid var(--fio-controle);
  background: color-mix(in srgb, var(--fio-controle) 12%, transparent);
}
</style>
