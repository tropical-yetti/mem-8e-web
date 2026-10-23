<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ArquivoMemoria from '@/components/ArquivoMemoria.vue'
import ControleTransacao from '@/components/ControleTransacao.vue'
import GradeMemoria from '@/components/GradeMemoria.vue'
import PainelCaixaPreta from '@/components/PainelCaixaPreta.vue'
import DetalhePortas from '@/components/portas/DetalhePortas.vue'
import DiagramaTempo from '@/components/DiagramaTempo.vue'
import { useSimuladorStore } from '@/stores/simulador'
import BalaoGuia from '@/guia/BalaoGuia.vue'
import { guiaJaVisto, useGuia } from '@/guia/guia'
import BalaoExperimento from '@/experimentos/BalaoExperimento.vue'
import ListaExperimentos from '@/experimentos/ListaExperimentos.vue'
import { useExperimentos } from '@/experimentos/experimentos'

const simulador = useSimuladorStore()
const { t } = useI18n()

const NIVEIS = ['1', '0', 'Z', 'X'] as const

const guia = useGuia()
const experimentos = useExperimentos()

/** O guia e um experimento não ficam abertos juntos. */
function reverGuia() {
  experimentos.sair()
  guia.iniciar()
}

// No primeiro acesso, o guia abre sozinho.
onMounted(() => {
  if (!guiaJaVisto()) guia.iniciar()
})
</script>

<template>
  <div class="simulador">
    <header class="topo">
      <h1>{{ t('simulador.titulo') }}</h1>
      <p class="intro">{{ t('simulador.intro') }}</p>
      <div class="atalhos">
        <button type="button" class="rever" data-guia="rever-guia" @click="reverGuia">
          {{ t('guia.rever') }}
        </button>
        <ListaExperimentos />
      </div>
    </header>

    <div class="principal">
      <div class="coluna">
        <PainelCaixaPreta />
        <ul class="legenda" :aria-label="t('legenda.titulo')">
          <li v-for="nivel in NIVEIS" :key="nivel">
            <span class="amostra" :class="`nivel-${nivel}`" aria-hidden="true"></span>
            <strong>{{ nivel }}</strong> {{ t(`legenda.${nivel}`) }}
          </li>
        </ul>
        <ControleTransacao />
        <DetalhePortas />
      </div>
      <div class="coluna">
        <GradeMemoria />
        <ArquivoMemoria />
        <button type="button" class="reiniciar" @click="simulador.reiniciar()">
          {{ t('simulador.reiniciar') }}
        </button>
      </div>
    </div>

    <DiagramaTempo />
    <BalaoGuia />
    <BalaoExperimento />
  </div>
</template>

<style scoped>
.simulador {
  display: grid;
  gap: 16px;
}
h1 {
  margin: 0;
  font-size: 1.5rem;
}
.intro {
  margin: 4px 0 0;
  max-width: 72ch;
  color: var(--texto-suave);
}
.atalhos {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
}
.rever {
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
.rever:hover {
  background: var(--fundo-hover);
}
.principal {
  display: grid;
  grid-template-columns: minmax(24rem, 1fr) auto;
  gap: 24px 32px;
  align-items: start;
}
.coluna {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.legenda {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  color: var(--texto-suave);
}
.legenda li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legenda strong {
  font-family: var(--mono);
  color: var(--texto);
}
.amostra {
  display: inline-block;
  width: 22px;
  height: 6px;
  border-radius: 2px;
  background: var(--fio-bd);
}
.amostra.nivel-0 {
  height: 2px;
  background: var(--fio-apagado);
}
.amostra.nivel-Z {
  height: 3px;
  background: repeating-linear-gradient(90deg, var(--fio-apagado) 0 5px, transparent 5px 9px);
}
.amostra.nivel-X {
  background: repeating-linear-gradient(
    -45deg,
    var(--fio-x) 0 4px,
    color-mix(in srgb, var(--fio-x) 45%, transparent) 4px 8px
  );
}
.reiniciar {
  justify-self: start;
  padding: 4px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--texto);
  background: none;
  border: 1px solid var(--borda);
  border-radius: 6px;
  cursor: pointer;
}
.reiniciar:hover {
  background: var(--fundo-hover);
}

@media (max-width: 1080px) {
  .principal {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
