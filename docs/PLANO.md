# Plano — MEM-8E Web

> Projeto irmão do [CPU-8E Web](https://github.com/tropical-yetti/cpu-8e-web).
> O CPU-8E trata a memória como caixa-preta (MAR → BE → memória → BD → MDR) e
> abstrai as linhas de controle. Aqui a gente abre essa caixa e mostra, passo a
> passo, o que acontece **dentro** da memória entre o endereço chegar ao
> barramento de endereços e o dado sair (ou entrar) pelo barramento de dados.

- **Nome:** `mem-8e-web`. O nome é neutro quanto ao idioma e deixa `mem-8e` livre
  como nome canônico, caso os autores do CPU-8E queiram fazer a versão deles.
- **Escopo:** só a memória. A decodificação de instruções fica para outro projeto.
- **Prioridade:** boa exibição na tela e interatividade. A simplicidade vem antes
  da fidelidade ao CPU-8E.
- **Sem legado:** não há referência em Pascal nem validação ciclo a ciclo. A
  validação é por transação e estado da memória.
- **Licença:** a mesma do CPU-8E Web, GPL-3.0-or-later, com `NOTICE.md`.

---

## 1. Objetivos de aprendizagem

Ao usar o simulador, o aluno deve conseguir explicar:

1. Por que a memória tem três grupos de sinais: **endereço** (BE), **dados**
   (BD, bidirecional) e **controle** (CS, OE/RD, WE/WR). O CPU-8E esconde os de
   controle; aqui eles aparecem.
2. Como um endereço binário escolhe **uma única** posição entre 256
   (decodificador → sinal "um entre N").
3. Por que memórias reais são organizadas como **matriz** (linhas × colunas).
4. Como o dado chega ao barramento sem "brigar" com os outros: buffer
   **tri-state** e estado de alta impedância **Z**.
5. A diferença entre leitura e escrita, e por que a **ordem** dos sinais importa.
6. Que **o ciclo de memória não é o ciclo da CPU**: a memória tem o próprio tempo
   de acesso, e uma CPU mais rápida que a memória precisa esperar (**wait states**).

## 2. Interação (o centro do projeto)

O uso principal é manual:

- **MAR editável:** o aluno digita o endereço em hex, decimal ou **clicando nos
  8 bits** (A7…A0). Cada mudança acende na hora a linha e a coluna escolhidas.
- **Memória editável:** clique numa posição da tabela ou numa célula da matriz
  para editar o byte, ou bit a bit.
- **MDR editável** para escrita, mostrando quem dirige o BD a cada momento.
- **Sinais de controle clicáveis** (CS, RD, WR): o aluno monta a transação na
  mão. Também há os botões **Ler** e **Escrever**, que tocam a sequência certa
  passo a passo.
- **Abrir e salvar a memória** num arquivo de texto, com endereço e bytes em
  hex, ou colar e copiar o mesmo texto ([ADR 0006](adr/0006-arquivo-de-memoria-em-texto.md)).
- **Experimentos "e se…?" guiados** ([ADR 0005](adr/0005-experimentos-guiados.md)):
  RD e WR juntos, contenção no BD (→ **X**), troca de endereço no meio da
  leitura, CPU que não espera uma memória lenta e CS desligado.

Todo controle funciona por teclado, e o estado é lido por leitor de tela
(mesmo padrão do CPU-8E Web).

## 3. A memória simulada

**256 × 8 bits**, endereços `00`–`FF`, organizada em **matriz 16 × 16**:

```
A7 A6 A5 A4 ──► decodificador de LINHA (4→16)  ──► 1 linha de palavra ativa
A3 A2 A1 A0 ──► decodificador de COLUNA (4→16) ──► 1 byte entre os 16 da linha
```

- **Leitura:** a linha ativa entrega seus 16 bytes. O seletor de coluna escolhe
  1 byte. Os buffers tri-state só ligam com `CS · RD`, e o dado aparece no BD.
- **Escrita:** o dado do BD vai para a coluna escolhida. Só o byte com
  `linha · coluna · WR` captura o valor.

O modelo é **funcional por bloco** (decodificadores, matriz, seletor, buffers)
e trabalha com sinais de 4 valores (`0`, `1`, `Z`, `X`). Não há um simulador
genérico de portas, o que mantém o núcleo simples e ainda mostra Z, X e
contenção (ver ADR-0001).

## 4. Visualização

O visual segue o painel do CPU-8E (cores, fontes, tabela de memória, destaque
de barramentos), com três vistas:

1. **Caixa-preta:** o bloco "Memória" ligado a MAR/MDR por BE, BD e
   CS/RD/WR. É a vista familiar para quem vem do CPU-8E.
2. **Por dentro:** decodificador de linha, matriz 16×16, seletor de coluna e
   buffers de E/S. A linha e a coluna ativas ficam acesas, e o cruzamento
   pisca. Os fios são coloridos por nível: `0`, `1`, `Z` (tracejado) e `X`
   (vermelho).
   Com um clique, um **detalhe** mostra o decodificador em portas lógicas (só
   uma saída em 1) ou uma célula de 1 bit (latch + tri-state).
3. **Diagrama de tempo** (painel inferior, sempre visível): formas de onda de
   CLK da CPU, BE, CS, RD, WR e BD, sincronizadas com o passo atual por um
   cursor vertical.

O nível de transistor fica **fora**. Ele é difícil de mostrar bem na tela e
ensina pouco nesta etapa.

## 5. Tempo: ciclo de memória ≠ ciclo de CPU

A memória tem parâmetros de tempo **genéricos e didáticos**, sem copiar
datasheet:

| Parâmetro | Significado                        |
| --------- | ---------------------------------- |
| t_AA      | do endereço estável ao dado válido |
| t_OE      | do RD ativo ao dado no barramento  |
| t_WP      | largura mínima do pulso de escrita |

A CPU tem um **clock configurável**. O diagrama mostra os dois eixos juntos:

- memória mais rápida que o ciclo: o dado chega a tempo;
- memória mais lenta: aparecem **wait states**, ciclos de CPU gastos só
  esperando a memória;
- se o MDR captura cedo demais, a leitura sai **errada** (valor X/inválido).
  Isso mostra por que o tempo importa.

### Modos de memória (roadmap)

Os modos são **modelos abstratos rotulados como didáticos**, e não JEDEC. Assim
não ficamos presos a uma implementação concreta que o CPU-8E nem teria:

| Modo                       | Ideia mostrada                                                         | Quando  |
| -------------------------- | ---------------------------------------------------------------------- | ------- |
| **Assíncrona** (tipo SRAM) | sem clock; o tempo conta a partir da mudança de endereço               | v1.0    |
| **Síncrona** (tipo SDRAM)  | clock próprio, latência em ciclos, "abrir linha" e depois "ler coluna" | pós-1.0 |
| **DDR simplificada**       | dado nas duas bordas do clock, rajada de bytes consecutivos            | pós-1.0 |

A matriz 16×16 da §3 já prepara os modos síncronos. Em SDRAM/DDR, a memória
primeiro **ativa uma linha** e depois **lê colunas** dela. Por isso ler
endereços seguidos na mesma linha é mais rápido que pular de linha, e essa
diferença aparece direto na tela. O núcleo guarda o tempo como parâmetros desde
a v1.0, para que os novos modos entrem sem refazer a interface.

## 6. Arquitetura

A pilha e as convenções são as do CPU-8E Web: **Vue 3 + Vite + TypeScript**,
Pinia, vue-router, vue-i18n (**pt-BR + en**), documentação em Markdown dentro
do app, Vitest, Playwright + axe, Lighthouse CI, ESLint + Prettier, checagem de
licenças, GitHub Pages e build de arquivo único.

```
src/
  core/                    ← sem dependência de interface
    nivel.ts               ← sinais de 4 valores: 0, 1, Z, X
    memoria.ts             ← matriz, decodificadores, seletor, buffers
    barramento.ts          ← quem dirige BE/BD; resolve Z e X (contenção)
    tempo.ts               ← parâmetros de tempo, clock da CPU, linha do tempo
    transacoes.ts          ← ler/escrever como geradores de passos
                             (mesmo padrão `yield` do controle.ts do CPU-8E)
    arquivo.ts             ← abrir/salvar a memória em texto
  stores/simulador.ts
  components/
    PainelCaixaPreta.vue
    PainelPorDentro.vue    ← matriz + detalhe em portas
    DiagramaTempo.vue
    EditorBits.vue         ← MAR/MDR/sinais clicáveis
    TabelaMemoria.vue      ← adaptada do CPU-8E Web
  docs/pt, docs/en
```

## 7. Validação

O "gabarito" é um modelo trivial, um array de 256 bytes:

- **Decodificadores:** para cada endereço, exatamente uma linha e uma coluna em 1.
- **Transações:** para todo endereço, `escrever(a, v)` seguido de `ler(a)`
  devolve `v`, e o resto da memória fica igual ao array (estado antes/depois).
- **Barramento:** BD fica em Z fora de leitura/escrita e vira X em contenção.
- **Tempo:** captura antes de t_AA dá leitura inválida; com wait states
  suficientes, a leitura sai correta.
- **Arquivos:** salvar e abrir de volta dá a mesma memória, inclusive com X;
  um arquivo com erro não muda nada.
- **Experimentos:** cada um prepara a situação e chega ao resultado esperado.
- **E2E:** Playwright (edição de MAR, edição de memória, ler, escrever, vistas)
  - axe sem violações.

## 8. Processo

O fluxo é o mesmo do CPU-8E Web 2.0+, aplicado desde o primeiro commit:

- `main` ← `dev` ← um ramo por funcionalidade ou correção.
- **ADRs** em Markdown (data, proponente, alternativas, motivação, impactos),
  com diagramas Mermaid versionados. Cada ADR é discutida numa issue.
  Primeiras ADRs:
  - 0001 modelo funcional por bloco com 4 valores (em vez de um simulador
    genérico de portas);
  - 0002 organização 16×16;
  - 0003 modelo de tempo genérico e modos abstratos;
  - 0004 reaproveitamento de código e estilo do CPU-8E Web.
- CHANGELOG, CONTRIBUTING, versionamento semântico, GPL-3.0-or-later + NOTICE.

## 9. Marcos

| Versão    | Entrega                                                                                                                                                                                                                                                                                                                                   | Situação |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0.1       | Esqueleto: Vite/Vue/TS, i18n, estilo do CPU-8E, CI, Pages, licença, ADRs 0001–0004.                                                                                                                                                                                                                                                       | feito    |
| 0.2       | Núcleo: sinais de 4 valores, memória 16×16, barramento, transações + testes.                                                                                                                                                                                                                                                              | feito    |
| 0.3       | Vista caixa-preta + MAR/MDR/memória editáveis + sinais de controle manuais + ler/escrever.                                                                                                                                                                                                                                                | feito    |
| 0.4       | Vista "por dentro" (decodificadores, matriz, linhas de bit, seletor, buffers).                                                                                                                                                                                                                                                            | feito    |
| 0.5       | Detalhe em portas (decodificador, célula de 1 bit). Prévia do site no CI.                                                                                                                                                                                                                                                                 | feito    |
| 0.6       | Diagrama de tempo + clock da CPU + wait states (modo assíncrono).                                                                                                                                                                                                                                                                         | feito    |
| 0.7       | Guia de primeiro acesso com balões e ajuda contextual ([#17](https://github.com/tropical-yetti/mem-8e-web/issues/17)).                                                                                                                                                                                                                    | feito    |
| 0.8       | Documentação no site, pt/en: como a memória funciona + roteiro de aula ([#18](https://github.com/tropical-yetti/mem-8e-web/issues/18)); legendas com o nome dos componentes ao apontar ([#23](https://github.com/tropical-yetti/mem-8e-web/issues/23)); commit no rodapé ([#24](https://github.com/tropical-yetti/mem-8e-web/issues/24)). | feito    |
| 0.9       | Experimentos "e se…?" guiados (ADR 0005); abrir e salvar a memória em texto (ADR 0006).                                                                                                                                                                                                                                                   | feito    |
| 1.0       | Revisão final de acessibilidade, testes e lançamento.                                                                                                                                                                                                                                                                                     |          |
| 1.x / 2.0 | Modos síncrono e DDR simplificados.                                                                                                                                                                                                                                                                                                       |          |

O guia de primeiro acesso e a documentação vieram para antes dos experimentos
porque o site já está publicado: quem chega precisa entender o que fazer.

## 10. Ideias para depois

- Expansão: dois chips + decodificação de endereço por CS (ponte para "mapa de memória").
- ROM e memória não volátil.
- Integração com o CPU-8E Web: clicar no bloco Memória e "entrar" no MEM-8E na
  transação corrente.
- Abrir `.bin` e `.asm` do CPU-8E, junto com essa integração: o programa
  seria executado pelo núcleo do CPU-8E Web, deixando claro que não é só
  preencher a memória.
- Próximo projeto da série: decodificação de instruções.
