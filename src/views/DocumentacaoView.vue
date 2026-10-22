<!--
  Documentação de uso: menu das páginas e conteúdo, no idioma escolhido.

  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import TabelaSiglas from '@/components/docs/TabelaSiglas.vue'
import { converter } from '@/docs/markdown'
import { PAGINAS, ehPagina, textoDaPagina, tituloDaPagina, type Pagina } from '@/docs/paginas'

const { t, locale } = useI18n()
const route = useRoute()

const pagina = computed<Pagina>(() =>
  ehPagina(route.params.pagina) ? route.params.pagina : 'primeiros-passos',
)
const blocos = computed(() => converter(textoDaPagina(pagina.value, locale.value)))
const indice = computed(() => PAGINAS.indexOf(pagina.value))
const anterior = computed(() => PAGINAS[indice.value - 1])
const proxima = computed(() => PAGINAS[indice.value + 1])

// Ao trocar de página ou idioma, rola para a seção pedida (#ancora) ou para o topo.
watch(
  [pagina, locale],
  async () => {
    await nextTick()
    const alvo = route.hash ? document.getElementById(route.hash.slice(1)) : null
    if (alvo) alvo.scrollIntoView()
    else window.scrollTo({ top: 0 })
  },
  { immediate: true },
)
</script>

<template>
  <div class="documentacao">
    <nav class="menu" :aria-label="t('docs.menu')">
      <h2 class="menu-titulo">{{ t('nav.documentacao') }}</h2>
      <ol>
        <li v-for="item in PAGINAS" :key="item">
          <RouterLink
            :to="`/documentacao/${item}`"
            :aria-current="item === pagina ? 'page' : undefined"
          >
            {{ tituloDaPagina(item, locale) }}
          </RouterLink>
        </li>
      </ol>
    </nav>

    <article class="conteudo-doc">
      <template v-for="(bloco, i) in blocos" :key="`${pagina}-${locale}-${i}`">
        <!-- O HTML vem dos arquivos Markdown do próprio projeto (sem HTML bruto). -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="bloco.tipo === 'html'" v-html="bloco.html" />
        <TabelaSiglas v-else />
      </template>

      <nav class="paginacao" :aria-label="t('docs.paginacao')">
        <RouterLink v-if="anterior" :to="`/documentacao/${anterior}`" class="anterior">
          ← {{ tituloDaPagina(anterior, locale) }}
        </RouterLink>
        <RouterLink v-if="proxima" :to="`/documentacao/${proxima}`" class="proxima">
          {{ tituloDaPagina(proxima, locale) }} →
        </RouterLink>
      </nav>
    </article>
  </div>
</template>

<style scoped>
.documentacao {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}
.menu {
  position: sticky;
  top: 16px;
}
.menu-titulo {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: var(--texto-suave);
}
.menu ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu a {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--texto);
  text-decoration: none;
}
.menu a:hover {
  background: var(--fundo-hover);
}
.menu a[aria-current='page'] {
  background: var(--fundo-cabecalho);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--destaque);
}
.conteudo-doc {
  max-width: 76ch;
  min-width: 0;
}
.conteudo-doc :deep(h1) {
  margin-top: 0;
  text-wrap: balance;
}
.conteudo-doc :deep(h2) {
  margin-top: 2em;
  text-wrap: balance;
  scroll-margin-top: 16px;
}
.conteudo-doc :deep(h3) {
  scroll-margin-top: 16px;
}
.conteudo-doc :deep(code) {
  font-family: var(--mono);
  font-size: 0.95em;
  background: var(--fundo-cabecalho);
  padding: 1px 4px;
  border-radius: 3px;
}
.conteudo-doc :deep(pre code) {
  background: none;
  padding: 0;
}
.conteudo-doc :deep(pre) {
  padding: 12px 16px;
  overflow-x: auto;
  background: var(--fundo-cabecalho);
  border-radius: 6px;
}
.conteudo-doc :deep(.tabela-rolavel) {
  overflow-x: auto;
  margin: 16px 0;
}
.conteudo-doc :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.conteudo-doc :deep(th),
.conteudo-doc :deep(td) {
  border: 1px solid var(--borda);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}
.conteudo-doc :deep(thead th) {
  background: var(--fundo-cabecalho);
}
.conteudo-doc :deep(blockquote) {
  margin: 16px 0;
  padding: 8px 16px;
  border-left: 3px solid var(--destaque);
  background: var(--fundo-cabecalho);
}
.paginacao {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid var(--borda);
}
.proxima {
  margin-left: auto;
  text-align: right;
}
@media (max-width: 720px) {
  .documentacao {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .menu {
    position: static;
  }
  .menu ol {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .menu a {
    padding: 4px 8px;
    border: 1px solid var(--borda);
    font-size: 0.9rem;
  }
  .menu a[aria-current='page'] {
    box-shadow: none;
    border-color: var(--destaque);
  }
}
</style>
