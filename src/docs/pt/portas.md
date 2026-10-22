# Em portas lógicas

O painel **Em portas lógicas** mostra três partes da memória como portas AND, OR e NOT. Os desenhos são as mesmas portas que o simulador calcula: os fios mudam junto com o resto da tela.

## Decodificador 4 → 16 {#decodificador}

O decodificador tem 4 entradas, uma entrada de habilitação (**EN**, ligada ao CS) e 16 saídas.

1. Cada entrada passa por uma porta **NOT**. Assim, de cada bit existem dois fios: o direto e o invertido.
2. Cada saída é uma porta **AND** de 5 entradas: o EN e, de cada bit, o fio direto (se o bit correspondente do número da saída é 1) ou o invertido (se é 0).

A saída 3 (`0011`) recebe A0 direto, A1 direto, A2 invertido, A3 invertido e EN. Só com a entrada `0011` e o EN em 1 todas essas entradas ficam em 1.

| Saída      | Recebe                     |
| ---------- | -------------------------- |
| 0 (`0000`) | ¬A3 · ¬A2 · ¬A1 · ¬A0 · EN |
| 3 (`0011`) | ¬A3 · ¬A2 · A1 · A0 · EN   |
| A (`1010`) | A3 · ¬A2 · A1 · ¬A0 · EN   |
| F (`1111`) | A3 · A2 · A1 · A0 · EN     |

Com um bit de entrada indefinido (X), duas saídas ficam em X: as duas que o endereço poderia escolher. As outras continuam em 0.

## Um bit da memória {#celula}

A aba **Bit do endereço** segue um bit (D0 a D7) da posição do MAR.

**Escrita.** Uma AND de 4 entradas (CS, WR, linha e coluna) libera o **latch D**. Enquanto ela está em 1, o latch copia o bit do BD. Quando ela volta a 0, o latch guarda o valor.

**Leitura.** O bit passa por três etapas:

1. **linha de palavra · Q**: uma AND põe o bit na linha de bit da coluna. Uma OR junta com as outras 15 linhas (só a linha ativa contribui);
2. **coluna · linha de bit**: outra AND, e uma OR com as outras 15 colunas: é o seletor de coluna;
3. **buffer tri-state**: só põe o resultado no BD com **CS · RD** em 1. Senão, a saída fica em Z.

## Por que um latch? {#latch}

O latch D é **transparente**: enquanto a escrita está liberada, a célula segue o BD. Por isso o dado precisa estar estável no BD durante todo o pulso de WR, e o pulso precisa durar o suficiente (o t_WP da [página de tempo](#/documentacao/tempo#tempos)).

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
