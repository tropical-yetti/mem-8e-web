# Registro de modificações

Este arquivo registra, com data, a evolução do MEM-8E Web.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e
as versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

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
