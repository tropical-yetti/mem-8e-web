# Registros de decisões de arquitetura (ADRs)

Cada decisão de arquitetura do MEM-8E Web fica registrada aqui, num arquivo
Markdown numerado. Os diagramas são escritos em Mermaid e versionados junto
com o texto.

## Como propor uma decisão

1. Abra uma issue com o modelo **Decisão de arquitetura (ADR)**.
2. Escreva a ADR num ramo, a partir de [`modelo.md`](modelo.md), com o
   próximo número livre e o estado **Proposta**.
3. A discussão acontece na issue. Quando a decisão for aprovada, o estado passa
   a **Aceita** e o pull request é integrado.

Por enquanto, a aprovação do mantenedor basta. Isso muda quando o projeto
tiver mais desenvolvedores.

Uma ADR aceita não é editada depois. Se a decisão mudar, uma nova ADR a
**substitui**, e a antiga passa ao estado "Substituída por NNNN".

## Índice

| Nº                                             | Decisão                                               | Estado   |
| ---------------------------------------------- | ----------------------------------------------------- | -------- |
| [0001](0001-modelo-funcional-por-bloco.md)     | Modelo funcional por bloco, com sinais de 4 valores   | Proposta |
| [0002](0002-matriz-16x16.md)                   | Memória 256 × 8 organizada em matriz 16 × 16          | Proposta |
| [0003](0003-modelo-de-tempo.md)                | Modelo de tempo genérico e modos de memória abstratos | Proposta |
| [0004](0004-reaproveitamento-do-cpu-8e-web.md) | Reaproveitamento de código e estilo do CPU-8E Web     | Proposta |
