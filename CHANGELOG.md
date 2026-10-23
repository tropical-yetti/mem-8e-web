# Registro de modificações

Este arquivo registra, com data, a evolução do MEM-8E Web.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e
as versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [0.9.0] — 2026-10-23

Experimentos "e se…?" guiados e a memória em arquivo de texto.

### 2026-10-23 — Experimentos "e se…?"

- Botão **Experimentos "e se…?"**, ao lado de "Ver o guia", com cinco
  experimentos guiados (ADR 0005): contenção no BD, RD e WR juntos, endereço
  trocado no meio da leitura, CPU que não espera uma memória lenta e CS
  desligado.
- Cada experimento monta a situação, faz uma pergunta, conduz os passos (o
  balão avança sozinho quando o passo é feito) e explica o resultado. Os que
  têm diferença para chips de verdade trazem uma observação sobre memórias
  reais. Sair (ou Esc) devolve o simulador ao estado de antes.
- Trocar o MAR no meio de uma leitura não cancela mais a transação: a fase
  seguinte já usa o novo endereço, e a contagem de t_AA recomeça. O diagrama
  de tempo marca a troca, e o MDR captura X se o novo dado não chegar a
  tempo. Numa escrita, mudar o MAR continua cancelando.
- O balão do guia virou uma base comum ao guia e aos experimentos.
- A página "Como a memória funciona" explica RD e WR juntos e como as
  memórias reais tratam isso; o roteiro de aula e os primeiros passos citam
  os experimentos.

### 2026-10-22 — Memória em arquivo de texto

- Botões **Abrir arquivo**, **Salvar arquivo**, **Colar texto** e **Copiar
  texto**, embaixo da grade (ADR 0006). O conteúdo da memória vira um texto
  com endereço e bytes em hex, `XX` para célula indefinida e 8 dígitos 0/1/X
  para uma célula com só alguns bits indefinidos.
- Abrir substitui a memória inteira. Um texto com erro não muda nada, e a
  mensagem diz a linha e a coluna do problema.
- Salvar e abrir de volta dá exatamente a mesma memória, inclusive os X.
- A página "Primeiros passos" explica o formato.

### 2026-10-22 — Plano da 0.9

- ADR 0005 (experimentos "e se…?" guiados) e ADR 0006 (conteúdo da memória
  em arquivo de texto) aprovadas nas issues #30 e #31. O formato `.bin` do
  CPU-8E sai do plano.

## [0.8.0] — 2026-10-22

Diagrama de tempo e wait states (0.6), guia de primeiro acesso (0.7) e
documentação no site com legendas dos componentes (0.8), publicados juntos.

### 2026-10-22 — Documentação

- Documentação dentro do site, em português e inglês, com sete páginas:
  primeiros passos, como a memória funciona, os quatro níveis (0, 1, Z, X),
  leitura, escrita e tempo, em portas lógicas, roteiro de aula com exercícios
  e respostas, e siglas.
- A tabela de siglas é gerada das mesmas mensagens das legendas.
- Os balões do guia têm um link "Ler mais" para a seção correspondente.
- O README ganhou uma seção de uso e uma captura de tela nova.
- Testes conferem que os dois idiomas têm as mesmas páginas e âncoras e que
  todos os links internos levam a uma página e uma seção que existem.

### 2026-10-22 — Legendas e commit no rodapé

- Legendas com o nome dos componentes: ao apontar, focar ou tocar nos fios e
  rótulos BE, BD, CS, RD, WR, nos pinos A7–A0 e D7–D0, no MAR, no MDR, no
  botão "MDR → BD" e nos nomes dos sinais do diagrama de tempo (CLK, READY…)
  aparece o nome completo e para que serve. A legenda também é a descrição
  acessível do elemento, e Esc a fecha.
- O rodapé mostra o commit de onde o site foi gerado, com link para ele no
  GitHub, para saber qual código está na tela.

### 2026-10-22 — Guia de primeiro acesso

- Na primeira visita, um guia de 8 balões apresenta cada parte da tela: MAR,
  sinais de controle, memória por dentro, transação passo a passo, portas
  lógicas e diagrama de tempo. Cada balão diz o que a parte faz e sugere algo
  para experimentar.
- O balão não bloqueia a página: dá para seguir a sugestão sem fechá-lo. A
  parte explicada fica em destaque, e o resto da tela escurece.
- Próximo, Voltar e Pular; Esc fecha. O navegador lembra que o guia já foi
  visto, e o botão "Ver o guia" o abre de novo.
- Ajuda contextual: um botão "?" no título de cada seção abre só o balão
  daquela parte.
- Funciona pelo teclado e com leitor de tela (o foco vai para o balão e volta
  para onde estava), respeita a preferência por menos movimento e se ajusta ao
  celular.

### 2026-10-22 — CI mais rápido

- Os testes de ponta a ponta rodam na imagem oficial do Playwright, que já
  traz os navegadores e as bibliotecas de sistema. A instalação, que às vezes
  levava mais de 15 minutos, deixa de existir.
- `@playwright/test` fixado numa versão exata, e um teste confere se ela é a
  mesma da imagem.

### 2026-10-22 — Diagrama de tempo e wait states

- Modelo de tempo no núcleo (ADR 0003), com tempos genéricos e didáticos:
  t_AA, t_OE e t_WP, três memórias de exemplo (rápida, média, lenta) e o
  clock da CPU (10, 25, 50 ou 100 MHz).
- A CPU trabalha em estados de clock (T1, T2, T3). Quando a memória é mais
  lenta, ela segura o READY em 0 e a CPU insere wait states (Tw).
- Sem wait states, uma memória lenta demais dá errado: a leitura captura X
  no MDR, e a escrita com pulso de WR curto demais deixa a célula em X.
- Diagrama de tempo com CLK, BE, CS, RD, WR, READY, BD e MDR (ou a célula),
  faixas para os estados de clock, marcas de "dado válido" e "captura" (ou
  do pulso mínimo de WR) e um cursor que acompanha a fase da transação.
  Sem transação, ele mostra uma prévia da leitura do endereço do MAR.
- A fase "Wait state" aparece na transação passo a passo quando há espera,
  e os textos explicam quando e por que a transação deu errado.

## [0.5.0] — 2026-10-22

Vista por dentro da memória (0.4) e detalhe em portas lógicas (0.5),
publicados juntos, além da prévia do site no CI.

### 2026-10-22 — Em portas lógicas

- Novo painel "Em portas lógicas", com três abas que acompanham o estado ao
  vivo:
  - **Bit do endereço**: um bit da posição do MAR, da escrita (AND de CS, WR,
    linha e coluna liberando o latch D) à leitura (linha de palavra, linha de
    bit, seletor de coluna e buffer tri-state ligado por CS · RD);
  - **Decodificador de linha** e **de coluna**: 4 portas NOT, a entrada EN e
    16 portas AND de 5 entradas, com a porta escolhida acesa.
- Os fios seguem o código dos 4 níveis, e cada desenho tem uma descrição em
  texto para leitores de tela.

### 2026-10-22 — Prévia no CI

- Cada execução do CI guarda o site num único `index.html`
  (artifact `previa-mem-8e-web`), para abrir no navegador sem servidor.

### 2026-10-21 — Vista por dentro da memória

- A grade 16 × 16 passa a ser a matriz, com os blocos desenhados em volta:
  decodificador de coluna acima (A3–A0, habilitado por CS), decodificador de
  linha à esquerda (A7–A4), e abaixo as linhas de bit, o seletor de coluna e
  os buffers de saída (CS · RD). Cada saída de decodificador cai sobre a sua
  linha ou coluna e segue o código dos 4 níveis.
- As linhas de bit mostram os 16 bytes da linha ativa: a linha inteira é lida,
  e o seletor escolhe um.
- A liberação da escrita (CS · WR) aparece com o valor que a célula do
  cruzamento vai copiar.
- Botão para alternar entre "Por dentro" e "Só o conteúdo"; a escolha é
  lembrada no navegador.

## [0.3.0] — 2026-10-21

Primeira versão com o simulador na tela: núcleo da memória (0.2) e vista
caixa-preta (0.3), publicadas juntas.

### 2026-10-21 — Primeira tela: vista caixa-preta

- Painel com a CPU (MAR, MDR, CS, RD, WR), os barramentos e a memória. O MAR
  e o MDR são editados em hexadecimal ou bit a bit, e os bits do MAR mostram
  qual parte escolhe a linha e qual escolhe a coluna.
- Os fios seguem o código dos 4 níveis: 1 cheio na cor do fio (BE verde,
  BD ciano, controle amarelo, como no CPU-8E), 0 fino e apagado, Z tracejado
  e X vermelho. As setas do BD mostram quem está dirigindo.
- CS, RD, WR e "MDR → BD" ligam e desligam à mão, o que permite provocar
  conflito no barramento ou uma escrita com o BD solto.
- Conteúdo da memória numa grade 16 × 16 (linha × coluna): com o CS ligado,
  acendem a linha e a coluna escolhidas pelos decodificadores. Um clique põe o
  endereço no MAR; dois cliques, Enter ou um dígito hexadecimal editam a
  posição. A grade inteira funciona pelo teclado.
- Leitura e escrita fase a fase, com a explicação de cada fase.
- A memória começa com um valor diferente em cada posição, para que cada
  leitura mostre um dado reconhecível.

### 2026-10-21 — Núcleo da memória

- Sinais de 4 valores (`0`, `1`, `Z`, `X`) com portas NOT, AND, OR, buffer
  tri-state e resolução de fios com várias fontes (contenção).
- Memória de 256 × 8 bits em matriz 16 × 16: decodificadores de linha e de
  coluna habilitados por CS, linhas de bit, seletor de coluna, buffers de saída
  (CS · RD) e células que copiam o barramento de dados com CS · WR.
- Sistema com MAR, MDR, CS, RD, WR e os barramentos BE e BD; a CPU e a memória
  disputam o BD e o resultado mostra quem está dirigindo.
- Leitura e escrita passo a passo, em fases nomeadas.
- Carregamento de programas `.bin` do CPU-8E (até 256 bytes, o resto zerado).
- Testes por transação e estado da memória contra um array de 256 bytes,
  inclusive com sequências aleatórias, e experimentos de contenção e de
  barramento solto.

### 2026-10-21 — ADRs aceitas

- ADRs 0001 a 0004 aprovadas nas issues #2 a #5.

## [0.1.0] — 2026-10-21

### 2026-10-21 — Esqueleto do projeto

- Projeto criado com Vite, Vue 3 e TypeScript, com a mesma estrutura, estilo e
  ferramentas do CPU-8E Web.
- Interface em português e inglês, com tema claro e escuro.
- Página inicial provisória e página Sobre, com licença e créditos ao CPU-8E.
- CI (formatação, lint, tipos, testes, licenças, build, testes de ponta a ponta
  com acessibilidade e Lighthouse) e publicação no GitHub Pages.
- Plano do projeto em `docs/PLANO.md` e ADRs 0001 a 0004 em `docs/adr/`
  (aceitas no mesmo dia, issues #2 a #5).
