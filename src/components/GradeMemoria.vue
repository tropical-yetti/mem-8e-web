<!--
  O conteúdo da memória como a matriz 16 × 16 (ADR 0002): o primeiro dígito
  do endereço é a linha e o segundo é a coluna.

  Quando o CS liga, a linha e a coluna escolhidas pelos decodificadores
  acendem, e o cruzamento é a posição acessada. O endereço do MAR fica
  sempre contornado.

  Teclado: setas movem o foco; Enter (ou um dígito hexadecimal) edita;
  espaço põe o endereço no MAR. Mouse: um clique põe o endereço no MAR,
  dois cliques editam.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { COLUNAS, enderecoDe, LINHAS, paraHex, type Nivel } from '@/core'
import { useSimuladorStore } from '@/stores/simulador'

const simulador = useSimuladorStore()
const { t } = useI18n()

const HEX = Array.from({ length: 16 }, (_, i) => i.toString(16).toUpperCase())
const indices = (n: number) => Array.from({ length: n }, (_, i) => i)

const interno = computed(() => simulador.avaliacao.interno)
const escritos = computed(() => new Set(simulador.avaliacao.escritos))

/** Endereço com o foco do teclado (uma só parada de Tab para a grade toda). */
const foco = ref(0)
const editando = ref<number | null>(null)
const texto = ref('')
const celulasEl = ref<HTMLElement[]>([])

function hexDe(endereco: number): string {
  return paraHex(simulador.celulas[endereco]!)
}

function classeDe(nivel: Nivel | undefined) {
  return nivel === 1 ? 'ativa' : nivel === 'X' ? 'indefinida' : null
}

function classesCelula(linha: number, coluna: number) {
  const endereco = enderecoDe(linha, coluna)
  const naLinha = interno.value.linhas[linha]
  const naColuna = interno.value.colunas[coluna]
  return {
    'na-linha': naLinha === 1,
    'na-coluna': naColuna === 1,
    cruzamento: naLinha === 1 && naColuna === 1,
    duvida: naLinha === 'X' || naColuna === 'X',
    mar: endereco === simulador.mar,
    escrita: escritos.value.has(endereco),
    'valor-x': simulador.celulas[endereco]!.some((bit) => bit !== 0 && bit !== 1),
  }
}

function focar(endereco: number) {
  foco.value = (endereco + 256) % 256
  nextTick(() => celulasEl.value[foco.value]?.focus())
}

function editar(endereco: number, inicial?: string) {
  editando.value = endereco
  texto.value = inicial ?? hexDe(endereco).replace(/[^0-9A-F]/g, '')
  nextTick(() => {
    const campo = document.getElementById('campo-celula') as HTMLInputElement | null
    campo?.focus()
    if (inicial === undefined) campo?.select()
  })
}

function confirmar() {
  const endereco = editando.value
  if (endereco === null) return
  if (/^[0-9A-F]{1,2}$/.test(texto.value)) {
    simulador.mudarCelula(endereco, Number.parseInt(texto.value, 16))
  }
  editando.value = null
  focar(endereco)
}

function cancelar() {
  const endereco = editando.value
  editando.value = null
  if (endereco !== null) focar(endereco)
}

function filtrar(evento: Event) {
  const campo = evento.target as HTMLInputElement
  texto.value = campo.value
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()
    .slice(0, 2)
  campo.value = texto.value
}

function teclado(evento: KeyboardEvent, endereco: number) {
  const mover: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: COLUNAS,
    ArrowUp: -COLUNAS,
  }
  if (evento.key in mover) {
    evento.preventDefault()
    focar(endereco + mover[evento.key]!)
  } else if (evento.key === 'Home') {
    evento.preventDefault()
    focar(endereco - (endereco % COLUNAS))
  } else if (evento.key === 'End') {
    evento.preventDefault()
    focar(endereco - (endereco % COLUNAS) + COLUNAS - 1)
  } else if (evento.key === 'Enter' || evento.key === 'F2') {
    evento.preventDefault()
    editar(endereco)
  } else if (evento.key === ' ') {
    evento.preventDefault()
    simulador.mudarMar(endereco)
  } else if (/^[0-9a-f]$/i.test(evento.key) && !evento.ctrlKey && !evento.metaKey) {
    evento.preventDefault()
    editar(endereco, evento.key.toUpperCase())
  }
}

function clicar(endereco: number) {
  foco.value = endereco
  simulador.mudarMar(endereco)
}

function rotulo(endereco: number): string {
  return t('grade.celula', {
    endereco: endereco.toString(16).toUpperCase().padStart(2, '0'),
    valor: hexDe(endereco),
  })
}
</script>

<template>
  <section class="grade" :aria-labelledby="'titulo-grade'">
    <h2 id="titulo-grade">{{ t('grade.titulo') }}</h2>
    <p id="ajuda-grade" class="ajuda">{{ t('grade.ajuda') }}</p>
    <div class="moldura">
      <table aria-describedby="ajuda-grade">
        <thead>
          <tr>
            <th scope="col" class="canto">
              <span class="visualmente-oculto">{{ t('grade.linhaColuna') }}</span>
            </th>
            <th
              v-for="coluna in indices(COLUNAS)"
              :key="coluna"
              scope="col"
              :class="classeDe(interno.colunas[coluna])"
            >
              {{ HEX[coluna] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="linha in indices(LINHAS)" :key="linha">
            <th scope="row" :class="classeDe(interno.linhas[linha])">{{ HEX[linha] }}</th>
            <td
              v-for="coluna in indices(COLUNAS)"
              :key="coluna"
              :ref="(el) => (celulasEl[enderecoDe(linha, coluna)] = el as HTMLElement)"
              :class="classesCelula(linha, coluna)"
              :tabindex="foco === enderecoDe(linha, coluna) && editando === null ? 0 : -1"
              :aria-label="rotulo(enderecoDe(linha, coluna))"
              :aria-current="enderecoDe(linha, coluna) === simulador.mar ? 'location' : undefined"
              @click="clicar(enderecoDe(linha, coluna))"
              @dblclick="editar(enderecoDe(linha, coluna))"
              @keydown="teclado($event, enderecoDe(linha, coluna))"
              @focus="foco = enderecoDe(linha, coluna)"
            >
              <input
                v-if="editando === enderecoDe(linha, coluna)"
                id="campo-celula"
                class="campo"
                :value="texto"
                maxlength="2"
                autocomplete="off"
                spellcheck="false"
                :aria-label="t('grade.editar', { endereco: HEX[linha]! + HEX[coluna]! })"
                @input="filtrar"
                @keydown.enter.prevent="confirmar"
                @keydown.esc.prevent="cancelar"
                @keydown.stop
                @blur="confirmar"
                @click.stop
                @dblclick.stop
              />
              <template v-else>{{ hexDe(enderecoDe(linha, coluna)) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.grade {
  min-width: 0;
}
h2 {
  margin: 0 0 2px;
  font-size: 0.95rem;
}
.ajuda {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: var(--texto-suave);
  max-width: 60ch;
}
.moldura {
  overflow-x: auto;
}
table {
  border-collapse: separate;
  border-spacing: 0;
  font: 0.85rem/1 var(--mono);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 6px;
}
th,
td {
  width: 1.95rem;
  height: 1.7rem;
  padding: 0;
  text-align: center;
}
th {
  font-weight: 700;
  color: var(--texto-suave);
  background: var(--fundo-cabecalho);
  transition: background-color 120ms;
}
th.ativa {
  color: var(--fundo);
  background: var(--fio-bd);
}
th.indefinida {
  color: var(--fundo);
  background: var(--fio-x);
}
td {
  position: relative;
  cursor: pointer;
  color: var(--texto);
  transition: background-color 120ms;
}
td:hover {
  background: var(--fundo-hover);
}
/* A mira: a linha e a coluna escolhidas pelos decodificadores. */
td.na-linha,
td.na-coluna {
  background: var(--mira);
}
td.cruzamento {
  background: var(--mira-forte);
  font-weight: 700;
}
td.duvida {
  background: color-mix(in srgb, var(--fio-x) 14%, transparent);
}
td.mar {
  box-shadow: inset 0 0 0 2px var(--texto);
  border-radius: 3px;
}
td.valor-x {
  color: var(--fio-x);
}
td.escrita {
  animation: escrita 900ms ease-out;
}
@keyframes escrita {
  from {
    background: var(--escrita);
  }
}
td:focus-visible {
  outline-offset: -2px;
}
.campo {
  width: 100%;
  height: 100%;
  padding: 0;
  font: inherit;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  color: var(--texto);
  background: var(--fundo-painel);
  border: 2px solid var(--destaque);
  border-radius: 3px;
}

@media (max-width: 480px) {
  th,
  td {
    width: 1.3rem;
    height: 1.45rem;
  }
  table {
    font-size: 0.68rem;
  }
}
</style>
