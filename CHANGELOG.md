# Registro de modificações

Este arquivo registra, com data, a evolução do MEM-8E Web.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e
as versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

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
