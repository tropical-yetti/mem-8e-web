# Como contribuir

Obrigado pelo interesse! Este projeto também é material de estudo, então o
código precisa ser fácil de ler.

## Ramos e pull requests

- `main` é o que está publicado no site. Ela só recebe **lançamentos**, para
  ficar estável e sem mudanças frequentes.
- `dev` recebe o trabalho em andamento.
- Cada funcionalidade ou correção tem o próprio ramo, criado a partir de `dev`
  (`feat/…`, `fix/…`, `docs/…`), e volta para `dev` por pull request.

### Versões e lançamentos

- **Versões menores** (1.1.0, 1.2.0…) ficam na `dev`: cada uma ganha a sua
  seção no CHANGELOG e o número no `package.json`, num pull request
  `chore: versão X.Y.Z` para a `dev`.
- **Lançamento:** quando um conjunto de versões menores está estável e
  testado, um único pull request `dev` → `main` publica tudo de uma vez. O
  lançamento ganha uma tag (`v1.2.0`) e uma release no GitHub.
- **Correção urgente** (um erro no site publicado): o ramo `fix/…` sai da
  `main`, vira uma versão de correção (1.0.1) e entra direto na `main`. Em
  seguida, a `main` é integrada na `dev`, para a correção não se perder no
  próximo lançamento.

## Decisões de arquitetura

Decisões de arquitetura são registradas como ADRs em [`docs/adr/`](docs/adr/).
Cada ADR é proposta e discutida numa issue antes de ser aceita. O processo
está em [`docs/adr/README.md`](docs/adr/README.md).

## Regras de código

- **Português no domínio:** nomes da arquitetura (`mar`, `mdr`, `barramento`,
  `decodificadorDeLinha`). Termos técnicos consagrados ficam como são
  (`buffer`, `tri-state`, `clock`).
- **Comentários explicam o porquê**, não o óbvio.
- **Núcleo sem interface:** nada em `src/core/` pode importar Vue, o DOM ou
  o navegador.
- **Textos da interface** sempre em `src/locales/` (português e inglês),
  nunca fixos nos componentes. Os dois arquivos precisam ter as mesmas chaves
  (`tests/traducoes.test.ts` confere).
- TypeScript estrito, sem `any`.

## Validação

Não há referência legada. O núcleo é validado por **transação** e **estado da
memória**: depois de cada leitura ou escrita, o resultado e a memória inteira
são comparados com um modelo trivial (um array de 256 bytes).

Antes de abrir um pull request:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e   # abre o site num navegador de verdade
```

## Licença e autoria

O projeto é GPL-3.0-or-later. Ao contribuir, você concorda em licenciar sua
contribuição nos mesmos termos.

- Todo arquivo novo leva `SPDX-License-Identifier: GPL-3.0-or-later`.
- Um arquivo derivado de um arquivo do CPU-8E original (por exemplo, copiado
  do CPU-8E Web) leva no cabeçalho a origem e o aviso de copyright original, e
  entra na lista `DERIVADOS` de `tests/licenca.test.ts`.
- Toda menção ao Prof. Joel Guilherme da Silva Filho leva ao
  [currículo Lattes](http://lattes.cnpq.br/7746085908957322) dele.
- Mudanças entram no `CHANGELOG.md`, com data.
- Novas dependências precisam ter licença compatível com a GPL-3.0
  (`npm run licencas` verifica isso no CI).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/):
`feat:`, `fix:`, `docs:`, `test:`, `chore:`.
