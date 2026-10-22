<!--
  Diagrama de tempo (ADR 0003): o clock da CPU e os sinais da memória no
  mesmo eixo, em nanossegundos.

  Os estados de clock (T1, T2, Tw, T3) aparecem como faixas; as faixas Tw
  são os wait states. Marcas verticais mostram quando o dado fica válido e
  quando a CPU o captura (ou, na escrita, o pulso mínimo de WR). Durante
  uma transação passo a passo, um cursor mostra o instante da fase atual.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CLOCKS_MHZ,
  dadoValidoEm,
  MEMORIAS,
  type IdSinal,
  type SinalNoTempo,
  type TipoMemoria,
  type Trecho,
} from '@/core'
import { useSimuladorStore } from '@/stores/simulador'
import BotaoAjuda from '@/guia/BotaoAjuda.vue'

const simulador = useSimuladorStore()
const { t } = useI18n()

const linha = computed(() => simulador.linhaDoTempo)

// Geometria (viewBox)
const LARGURA = 1000
const X0 = 96
const X1 = 984
const TOPO = 26
const ALTURA_LINHA = 34
const AMPLITUDE = 18

const escala = computed(() => (X1 - X0) / linha.value.fim)
const x = (tempo: number) => X0 + tempo * escala.value
const yLinha = (i: number) => TOPO + i * ALTURA_LINHA
const altura = computed(() => yLinha(linha.value.sinais.length) + 40)

const NOMES: Record<IdSinal, string> = {
  clk: 'CLK',
  be: 'BE',
  cs: 'CS',
  rd: 'RD',
  wr: 'WR',
  ready: 'READY',
  bd: 'BD',
  mdr: 'MDR',
  celula: 'M[ ]',
}

function nome(id: IdSinal): string {
  if (id === 'be' || id === 'bd') return t(`painel.${id}`)
  if (id === 'celula') return `M[${linha.value.sinais[1]?.trechos[0]?.valor ?? ''}]`
  return NOMES[id]
}

function classeSinal(id: IdSinal): string {
  if (id === 'be') return 'cor-be'
  if (id === 'bd') return 'cor-bd'
  if (id === 'mdr' || id === 'celula') return 'cor-registro'
  if (id === 'clk') return 'cor-clock'
  return 'cor-controle'
}

/** Caminho de um sinal de 1 bit: degraus entre o nível alto e o baixo. */
function caminhoBit(sinal: SinalNoTempo, i: number): string {
  const alto = yLinha(i) + (ALTURA_LINHA - AMPLITUDE) / 2
  const baixo = alto + AMPLITUDE
  let d = ''
  sinal.trechos.forEach((trecho, j) => {
    const y = trecho.valor === 1 ? alto : baixo
    d += j === 0 ? `M ${x(trecho.de)} ${y}` : ` L ${x(trecho.de)} ${y}`
    d += ` L ${x(trecho.ate)} ${y}`
  })
  return d
}

/** Hexágono de um trecho de barramento (o desenho usual de diagramas de tempo). */
function hexagono(trecho: Trecho, i: number): string {
  const topo = yLinha(i) + (ALTURA_LINHA - AMPLITUDE) / 2
  const base = topo + AMPLITUDE
  const meio = (topo + base) / 2
  const a = x(trecho.de)
  const b = x(trecho.ate)
  const bico = Math.min(4, (b - a) / 2)
  return `M ${a} ${meio} L ${a + bico} ${topo} L ${b - bico} ${topo} L ${b} ${meio} L ${b - bico} ${base} L ${a + bico} ${base} Z`
}

const meioDaLinha = (i: number) => yLinha(i) + ALTURA_LINHA / 2

/** Marcas de tempo do eixo, uma por período de clock. */
const marcasEixo = computed(() => {
  const lista: number[] = []
  for (let tempo = 0; tempo <= linha.value.fim + 0.001; tempo += linha.value.periodo) {
    lista.push(Math.round(tempo * 10) / 10)
  }
  return lista
})

/** A captura (ou o fim do pulso) cai antes do que a memória precisa: dá errado. */
const marcas = computed(() =>
  linha.value.marcas.map((marca) => ({
    ...marca,
    // Uma marca depois do fim do ciclo (o dado só ficaria válido depois) fica presa na borda.
    tela: Math.min(marca.t, linha.value.fim),
    depois: marca.t > linha.value.fim,
    errada: !linha.value.certo && (marca.id === 'captura' || marca.id === 'fimPulso'),
  })),
)

const ns = (tempo: number) => `${Math.round(tempo * 10) / 10} ns`

const resumo = computed(() => {
  const l = linha.value
  const p = simulador.tempo
  const valores = {
    valido: ns(dadoValidoEm(p)),
    captura: ns(l.marcas.find((m) => m.id === 'captura')?.t ?? 0),
    twp: ns(p.tWP),
    pulso: ns((1 + l.esperas) * l.periodo),
    esperas: t('tempo.esperas', l.esperas),
    fim: ns(l.fim),
    ciclos: l.estados.length,
  }
  const chave = l.tipo === 'ler' ? 'leitura' : 'escrita'
  return t(`tempo.resumo.${chave}${l.certo ? '' : 'Errada'}`, valores)
})

const titulo = computed(() =>
  simulador.fases
    ? t(`tempo.titulo.${linha.value.tipo}`, {
        endereco: linha.value.sinais[1]?.trechos[0]?.valor ?? '',
      })
    : t('tempo.titulo.previa', { endereco: linha.value.sinais[1]?.trechos[0]?.valor ?? '' }),
)

const TIPOS: TipoMemoria[] = ['rapida', 'media', 'lenta']

function aoMudarClock(evento: Event) {
  simulador.mudarClock(Number((evento.target as HTMLSelectElement).value))
}
function aoMudarMemoria(evento: Event) {
  simulador.mudarMemoria((evento.target as HTMLSelectElement).value as TipoMemoria)
}
function aoMudarEspera(evento: Event) {
  simulador.mudarEspera((evento.target as HTMLInputElement).checked)
}
</script>

<template>
  <section class="tempo" aria-labelledby="titulo-tempo" data-guia="tempo">
    <div class="cabeca">
      <h2 id="titulo-tempo">{{ t('tempo.nome') }} <BotaoAjuda passo="tempo" /></h2>
      <p class="subtitulo">{{ titulo }}</p>
    </div>

    <div class="controles">
      <span class="campo">
        <label for="tempo-clock">{{ t('tempo.clock') }}</label>
        <select id="tempo-clock" :value="simulador.clockMhz" @change="aoMudarClock">
          <option v-for="mhz in CLOCKS_MHZ" :key="mhz" :value="mhz">
            {{ mhz }} MHz ({{ t('tempo.periodo', { ns: 1000 / mhz }) }})
          </option>
        </select>
      </span>
      <span class="campo">
        <label for="tempo-memoria">{{ t('tempo.memoria') }}</label>
        <select id="tempo-memoria" :value="simulador.tipoMemoria" @change="aoMudarMemoria">
          <option v-for="tipo in TIPOS" :key="tipo" :value="tipo">
            {{ t(`tempo.memorias.${tipo}`) }} (t_AA {{ MEMORIAS[tipo].tAA }} ns, t_OE
            {{ MEMORIAS[tipo].tOE }} ns, t_WP {{ MEMORIAS[tipo].tWP }} ns)
          </option>
        </select>
      </span>
      <label class="caixa">
        <input type="checkbox" :checked="simulador.esperar" @change="aoMudarEspera" />
        {{ t('tempo.esperar') }}
      </label>
    </div>

    <p class="resumo" :class="{ errado: !linha.certo }" aria-live="polite">{{ resumo }}</p>

    <!-- No celular o diagrama rola de lado: a moldura precisa receber o foco do teclado. -->
    <div class="moldura" tabindex="0" role="region" :aria-label="t('tempo.nome')">
      <svg
        class="diagrama"
        :viewBox="`0 0 ${LARGURA} ${altura}`"
        role="img"
        :aria-label="`${titulo}. ${resumo}`"
      >
        <defs>
          <pattern
            id="hachura-x"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" class="fundo-x" />
            <line x1="0" y1="0" x2="0" y2="6" class="linha-x" />
          </pattern>
        </defs>

        <!-- Estados de clock -->
        <g v-for="(estado, i) in linha.estados" :key="i">
          <rect
            class="faixa"
            :class="{ espera: estado.nome === 'Tw', par: i % 2 === 1 }"
            :x="x(estado.de)"
            :y="TOPO - 18"
            :width="x(estado.ate) - x(estado.de)"
            :height="altura - TOPO - 4"
          />
          <text
            :x="(x(estado.de) + x(estado.ate)) / 2"
            :y="TOPO - 5"
            text-anchor="middle"
            class="estado"
          >
            {{ estado.nome }}
          </text>
        </g>

        <!-- Sinais -->
        <g v-for="(sinal, i) in linha.sinais" :key="sinal.id" :class="classeSinal(sinal.id)">
          <text
            :x="X0 - 10"
            :y="meioDaLinha(i) + 4"
            text-anchor="end"
            class="nome-sinal"
            :data-sigla="sinal.id === 'celula' ? undefined : sinal.id"
          >
            {{ nome(sinal.id) }}
          </text>
          <path v-if="sinal.tipo === 'bit'" class="onda" :d="caminhoBit(sinal, i)" />
          <template v-else>
            <template v-for="(trecho, j) in sinal.trechos" :key="j">
              <line
                v-if="trecho.valor === 'Z'"
                class="solto"
                :x1="x(trecho.de)"
                :y1="meioDaLinha(i)"
                :x2="x(trecho.ate)"
                :y2="meioDaLinha(i)"
              />
              <path v-else-if="trecho.valor === 'X'" class="indefinido" :d="hexagono(trecho, i)" />
              <template v-else>
                <path class="valor" :d="hexagono(trecho, i)" />
                <text
                  v-if="x(trecho.ate) - x(trecho.de) > 22"
                  :x="(x(trecho.de) + x(trecho.ate)) / 2"
                  :y="meioDaLinha(i) + 4"
                  text-anchor="middle"
                  class="texto-valor"
                >
                  {{ trecho.valor }}
                </text>
              </template>
            </template>
          </template>
        </g>

        <!-- Marcas: dado válido, captura, pulso mínimo -->
        <g
          v-for="(marca, i) in marcas"
          :key="marca.id"
          class="marca"
          :class="{ errada: marca.errada }"
        >
          <line
            v-if="!marca.depois"
            :x1="x(marca.t)"
            :y1="TOPO - 2"
            :x2="x(marca.t)"
            :y2="altura - 26"
          />
          <text
            :x="x(marca.tela)"
            :y="altura - 14 + (i % 2) * 12"
            :text-anchor="i % 2 && !marca.depois ? 'start' : 'end'"
            :dx="i % 2 && !marca.depois ? 4 : -4"
          >
            {{ t(`tempo.marcas.${marca.id}`, { t: ns(marca.t) }) }}{{ marca.depois ? ' →' : '' }}
          </text>
        </g>

        <!-- Eixo em nanossegundos -->
        <g class="eixo">
          <text
            v-for="tempo in marcasEixo"
            :key="tempo"
            :x="x(tempo)"
            :y="yLinha(linha.sinais.length) + 6"
            text-anchor="middle"
          >
            {{ tempo }}
          </text>
          <text :x="X0 - 10" :y="yLinha(linha.sinais.length) + 6" text-anchor="end">ns</text>
        </g>

        <!-- Cursor da fase atual -->
        <g v-if="simulador.instanteAtual !== null" class="cursor">
          <line
            :x1="x(simulador.instanteAtual)"
            :y1="TOPO - 18"
            :x2="x(simulador.instanteAtual)"
            :y2="yLinha(linha.sinais.length) - 4"
          />
          <path :d="`M ${x(simulador.instanteAtual) - 6} ${TOPO - 22} h 12 l -6 8 z`" />
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped>
.tempo {
  display: grid;
  gap: 10px;
}
.cabeca {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
}
h2 {
  margin: 0;
  font-size: 0.95rem;
}
.subtitulo {
  margin: 0;
  font-size: 0.85rem;
  color: var(--texto-suave);
}
.controles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  font-size: 0.88rem;
}
.controles .campo,
.controles .caixa {
  display: inline-flex;
  flex-wrap: wrap;
  max-width: 100%;
  align-items: center;
  gap: 6px;
}
select {
  max-width: 100%;
  padding: 3px 6px;
  font: inherit;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 4px;
}
.caixa input {
  width: 18px;
  height: 18px;
  accent-color: var(--destaque);
}
.resumo {
  margin: 0;
  max-width: 90ch;
  font-size: 0.9rem;
}
.resumo.errado {
  color: var(--fio-x);
  font-weight: 600;
}
.moldura {
  overflow-x: auto;
  padding: 6px 0;
  background: var(--fundo-painel);
  border: 1px solid var(--borda);
  border-radius: 8px;
}
.diagrama {
  display: block;
  width: 100%;
  min-width: 720px;
  height: auto;
  font-family: var(--mono);
  font-size: 12px;
}
.faixa {
  fill: transparent;
}
.faixa.par {
  fill: color-mix(in srgb, var(--texto-suave) 7%, transparent);
}
.faixa.espera {
  fill: var(--escrita);
  opacity: 0.45;
}
.estado {
  fill: var(--texto-suave);
  font-weight: 700;
}
.nome-sinal {
  fill: var(--texto);
  font-weight: 700;
}
.onda {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
}
.cor-clock {
  --cor: var(--texto-suave);
}
.cor-controle {
  --cor: color-mix(in srgb, var(--fio-controle) 70%, var(--texto));
}
.cor-be {
  --cor: var(--fio-be);
}
.cor-bd {
  --cor: var(--fio-bd);
}
.cor-registro {
  --cor: var(--texto);
}
.onda,
.valor {
  stroke: var(--cor);
}
.valor {
  fill: color-mix(in srgb, var(--cor) 14%, transparent);
  stroke-width: 1.5;
}
.texto-valor {
  fill: var(--texto);
  font-weight: 700;
}
.solto {
  stroke: var(--fio-apagado);
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
}
.indefinido {
  fill: url(#hachura-x);
  stroke: var(--fio-x);
  stroke-width: 1.2;
}
.fundo-x {
  fill: color-mix(in srgb, var(--fio-x) 10%, transparent);
}
.linha-x {
  stroke: var(--fio-x);
  stroke-width: 1.5;
}
.marca line {
  stroke: var(--fio-bd);
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}
.marca text {
  fill: color-mix(in srgb, var(--fio-bd) 45%, var(--texto));
  font-size: 11px;
}
.marca.errada line {
  stroke: var(--fio-x);
}
.marca.errada text {
  fill: var(--fio-x);
  font-weight: 700;
}
.eixo text {
  fill: var(--texto-suave);
  font-size: 11px;
}
.cursor line {
  stroke: var(--destaque);
  stroke-width: 2;
}
.cursor path {
  fill: var(--destaque);
}
</style>
