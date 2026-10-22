/**
 * Rotas do site. Usa o modo "hash" (#/sobre) porque o GitHub Pages não
 * redireciona caminhos desconhecidos para o index.html.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import SimuladorView from '@/views/SimuladorView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  // Links para uma seção (#ancora) rolam até ela; o resto começa do topo.
  scrollBehavior: (destino) => (destino.hash ? { el: destino.hash } : { top: 0 }),
  routes: [
    { path: '/', name: 'simulador', component: SimuladorView },
    {
      path: '/documentacao/:pagina?',
      name: 'documentacao',
      component: () => import('@/views/DocumentacaoView.vue'),
    },
    { path: '/sobre', name: 'sobre', component: () => import('@/views/SobreView.vue') },
  ],
})
