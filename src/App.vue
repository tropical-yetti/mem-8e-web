<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IDIOMAS, trocarIdioma, type Idioma } from '@/i18n'
import { URL_CODIGO_FONTE } from '@/config'

const { t, locale } = useI18n()
const VERSAO = __VERSAO__

const NOMES_IDIOMAS: Record<Idioma, string> = { 'pt-BR': 'Português', en: 'English' }

function aoTrocarIdioma(evento: Event) {
  trocarIdioma((evento.target as HTMLSelectElement).value as Idioma)
}
</script>

<template>
  <header class="cabecalho">
    <div class="marca">
      <span class="marca-titulo">{{ t('app.titulo') }}</span>
      <span class="marca-subtitulo">{{ t('app.subtitulo') }}</span>
    </div>
    <nav class="navegacao">
      <RouterLink to="/">{{ t('nav.simulador') }}</RouterLink>
      <RouterLink to="/sobre">{{ t('nav.sobre') }}</RouterLink>
    </nav>
    <label class="idioma">
      <span class="visualmente-oculto">{{ t('idioma.rotulo') }}</span>
      <select :value="locale" @change="aoTrocarIdioma">
        <option v-for="idioma in IDIOMAS" :key="idioma" :value="idioma">
          {{ NOMES_IDIOMAS[idioma] }}
        </option>
      </select>
    </label>
  </header>

  <main class="conteudo">
    <RouterView />
  </main>

  <!-- Avisos legais exigidos pela GPL-3.0 (seção 5d) -->
  <footer class="rodape">
    <span>{{ t('rodape.copyright') }}</span>
    <span>{{ t('rodape.versao', { versao: VERSAO }) }}</span>
    <span>
      <RouterLink to="/sobre">{{ t('rodape.licenca') }}</RouterLink>
      ·
      <a :href="URL_CODIGO_FONTE" target="_blank" rel="noopener">{{ t('rodape.codigoFonte') }}</a>
    </span>
  </footer>
</template>

<style scoped>
.cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--borda);
}
.marca {
  display: flex;
  flex-direction: column;
  margin-right: auto;
}
.marca-titulo {
  font-weight: 700;
  font-size: 1.1rem;
}
.marca-subtitulo {
  font-size: 0.85rem;
  color: var(--texto-suave);
}
.navegacao {
  display: flex;
  gap: 16px;
}
.navegacao a {
  color: var(--texto);
  text-decoration: none;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
}
.navegacao a.router-link-exact-active {
  border-bottom-color: var(--destaque);
}
.conteudo {
  flex: 1;
  padding: 24px 16px;
  max-width: 1360px;
  width: 100%;
  margin: 0 auto;
}
.rodape {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--borda);
  font-size: 0.8rem;
  color: var(--texto-suave);
}
.rodape a {
  color: inherit;
}
@media (max-width: 720px) {
  .cabecalho {
    gap: 8px 16px;
  }
  .marca {
    flex-basis: 100%;
  }
  .conteudo {
    padding: 12px 16px;
  }
}
</style>
