<!--
  Abrir, salvar, colar e copiar o conteúdo da memória em texto (ADR 0006).

  Abrir substitui a memória inteira; um texto com erro não muda nada, e a
  mensagem diz a linha e a coluna do problema. Colar abre uma janela com o
  mesmo formato, útil no celular, onde arquivos são mais difíceis.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ErroArquivo, type ResultadoLeitura } from '@/core'
import { useSimuladorStore } from '@/stores/simulador'

const simulador = useSimuladorStore()
const { t } = useI18n()

/** Arquivos maiores que isto não são uma memória de 256 bytes. */
const TAMANHO_MAXIMO = 64 * 1024
const NOME_ARQUIVO = 'memoria-mem-8e.txt'

const seletor = ref<HTMLInputElement | null>(null)
const janela = ref<HTMLDialogElement | null>(null)
const campo = ref<HTMLTextAreaElement | null>(null)

/** Data de hoje (AAAA-MM-DD) e versão do site, para o cabeçalho do texto. */
function cabecalho() {
  const hoje = new Date()
  const dois = (n: number) => String(n).padStart(2, '0')
  const data = `${hoje.getFullYear()}-${dois(hoje.getMonth() + 1)}-${dois(hoje.getDate())}`
  return { data, versao: __VERSAO__ }
}

const mensagem = ref<{ texto: string; erro: boolean } | null>(null)
const textoColado = ref('')
const erroColado = ref<string | null>(null)

function descreverErro(erro: ErroArquivo): string {
  const onde = t('arquivo.onde', { linha: erro.linha, coluna: erro.coluna })
  const endereco = erro.endereco?.toString(16).toUpperCase().padStart(2, '0')
  return `${onde} ${t(`arquivo.erros.${erro.tipo}`, { trecho: erro.trecho, endereco })} ${t('arquivo.semMudanca')}`
}

function descreverResultado(resultado: ResultadoLeitura): { texto: string; erro: boolean } {
  if (!resultado.ok) return { texto: descreverErro(resultado.erro), erro: true }
  return { texto: t('arquivo.aberto', { n: resultado.citadas }, resultado.citadas), erro: false }
}

// Abrir e salvar arquivo -------------------------------------------------

function escolherArquivo() {
  seletor.value?.click()
}

async function abrirArquivo(evento: Event) {
  const entrada = evento.target as HTMLInputElement
  const arquivo = entrada.files?.[0]
  // Limpa a escolha para que o mesmo arquivo possa ser aberto de novo.
  entrada.value = ''
  if (!arquivo) return
  if (arquivo.size > TAMANHO_MAXIMO) {
    mensagem.value = {
      texto: `${t('arquivo.erros.muitoGrande')} ${t('arquivo.semMudanca')}`,
      erro: true,
    }
    return
  }
  const texto = await arquivo.text()
  mensagem.value = descreverResultado(simulador.abrirTexto(texto))
}

function salvarArquivo() {
  const blob = new Blob([simulador.textoDaMemoria(cabecalho())], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = NOME_ARQUIVO
  link.click()
  URL.revokeObjectURL(url)
  mensagem.value = { texto: t('arquivo.salvo', { nome: NOME_ARQUIVO }), erro: false }
}

// Colar e copiar texto ---------------------------------------------------

async function abrirJanela() {
  erroColado.value = null
  janela.value?.showModal()
  await nextTick()
  campo.value?.focus()
}

function fecharJanela() {
  janela.value?.close()
}

function abrirColado() {
  const resultado = simulador.abrirTexto(textoColado.value)
  if (!resultado.ok) {
    // A janela fica aberta, com o texto, para corrigir.
    erroColado.value = descreverErro(resultado.erro)
    return
  }
  mensagem.value = descreverResultado(resultado)
  textoColado.value = ''
  fecharJanela()
}

async function copiarTexto() {
  try {
    await navigator.clipboard.writeText(simulador.textoDaMemoria(cabecalho()))
    mensagem.value = { texto: t('arquivo.copiado'), erro: false }
  } catch {
    mensagem.value = { texto: t('arquivo.erros.copiar'), erro: true }
  }
}
</script>

<template>
  <section class="arquivo" :aria-label="t('arquivo.titulo')" data-guia="arquivo">
    <div class="botoes">
      <button type="button" @click="escolherArquivo">{{ t('arquivo.abrir') }}</button>
      <button type="button" @click="salvarArquivo">{{ t('arquivo.salvar') }}</button>
      <button type="button" @click="abrirJanela">{{ t('arquivo.colar') }}</button>
      <button type="button" @click="copiarTexto">{{ t('arquivo.copiar') }}</button>
      <input
        ref="seletor"
        type="file"
        accept=".txt,text/plain"
        class="visualmente-oculto"
        tabindex="-1"
        aria-hidden="true"
        data-testid="arquivo-entrada"
        @change="abrirArquivo"
      />
    </div>
    <p class="mensagem" :class="{ erro: mensagem?.erro }" role="status">
      {{ mensagem?.texto }}
    </p>

    <dialog ref="janela" class="janela" aria-labelledby="colar-titulo" @close="erroColado = null">
      <form method="dialog" @submit.prevent="abrirColado">
        <h2 id="colar-titulo">{{ t('arquivo.colarTitulo') }}</h2>
        <p id="colar-ajuda" class="ajuda">{{ t('arquivo.colarAjuda') }}</p>
        <label for="colar-texto" class="visualmente-oculto">{{ t('arquivo.colarCampo') }}</label>
        <textarea
          id="colar-texto"
          ref="campo"
          v-model="textoColado"
          rows="10"
          spellcheck="false"
          autocapitalize="off"
          aria-describedby="colar-ajuda colar-erro"
          :aria-invalid="erroColado ? 'true' : undefined"
          placeholder="00: 3A 10 C4 FF"
        ></textarea>
        <p id="colar-erro" class="mensagem erro" role="alert">{{ erroColado }}</p>
        <div class="acoes">
          <button type="button" @click="fecharJanela">{{ t('arquivo.cancelar') }}</button>
          <button type="submit" class="principal">{{ t('arquivo.abrirColado') }}</button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.arquivo {
  display: grid;
  gap: 4px;
}
.botoes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
button {
  min-height: 28px;
  padding: 4px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--texto);
  background: none;
  border: 1px solid var(--borda);
  border-radius: 6px;
  cursor: pointer;
}
button:hover {
  background: var(--fundo-hover);
}
button.principal {
  font-weight: 600;
  color: var(--sobre-destaque);
  background: var(--destaque);
  border-color: var(--destaque);
}
.mensagem {
  min-height: 1.2em;
  margin: 0;
  font-size: 0.85rem;
  color: var(--texto-suave);
}
.mensagem:empty {
  min-height: 0;
}
.mensagem.erro {
  color: var(--fio-x);
  font-weight: 600;
}
.janela {
  width: min(36rem, calc(100vw - 32px));
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
.janela h2 {
  margin: 0 0 6px;
  font-size: 1.05rem;
}
.ajuda {
  margin: 0 0 8px;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--texto-suave);
}
textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 8px;
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--texto);
  background: var(--fundo-tabela);
  border: 1px solid var(--borda);
  border-radius: 6px;
  resize: vertical;
}
textarea[aria-invalid='true'] {
  border-color: var(--fio-x);
}
.janela .mensagem {
  margin: 6px 0 0;
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 10px;
}
</style>
