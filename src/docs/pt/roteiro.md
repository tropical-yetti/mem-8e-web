# Roteiro de aula

Exercícios para fazer no simulador, do mais simples ao mais elaborado. As respostas ficam no fim da página.

## 1. Endereços e a matriz {#ex-matriz}

1. Em que linha e coluna fica o endereço `C4`? E o `0F`?
2. Ponha `00` no MAR e ligue um bit de cada vez, de A0 a A7. O que muda na grade a cada bit?
3. Quantos endereços ficam na mesma linha que `3A`? Quais são?

## 2. Os sinais de controle {#ex-sinais}

1. Ponha `3A` no MAR e ligue só o **RD**. O dado aparece no BD? Por quê?
2. Agora ligue o **CS**. O que mudou na grade e no BD?
3. Com CS e RD ligados, ligue **MDR → BD** com MDR = `00`. Que bits do BD ficam em X?

## 3. Escrita {#ex-escrita}

1. Escreva `AA` no endereço `10` usando **Escrever**. Em que fase a célula muda?
2. Agora, à mão: ponha `20` no MAR, ligue **CS** e depois **WR**, sem ligar **MDR → BD**. O que acontece com a célula `20`? Por quê?

## 4. Tempo e wait states {#ex-tempo}

1. Com o clock de 50 MHz e a memória média, quantos wait states tem uma leitura? Quanto dura o ciclo?
2. Troque o clock para 10 MHz. E agora?
3. Com a memória lenta e o clock de 100 MHz, quantos wait states há? O que isso diz sobre usar uma CPU rápida com uma memória lenta?
4. Desmarque **"A CPU espera a memória"**, mantenha a memória lenta e leia um endereço. O que o MDR recebe?

## 5. Em portas lógicas {#ex-portas}

1. No decodificador de linha, que entradas recebe a porta da saída `5`?
2. Ponha `3A` no MAR e ligue o CS. No **Bit do endereço**, escolha D0: a linha de bit vale 0 ou 1? Confira com o valor de `M[3A]`.

## Respostas {#respostas}

**1.** (1) `C4`: linha C, coluna 4; `0F`: linha 0, coluna F. (2) A0 a A3 movem a coluna (1, 2, 4 e 8 colunas); A4 a A7 movem a linha. (3) 16 endereços: `30` a `3F`.

**2.** (1) Não: sem o CS, os decodificadores e os buffers ficam desligados, e o BD continua em Z. (2) A linha 3 e a coluna A acendem, e o dado aparece no BD. (3) Os bits em que o dado da memória é 1, porque a CPU puxa para 0 e a memória para 1.

**3.** (1) Na fase **WR liga**. (2) A célula fica indefinida (X): ela copiou um BD solto.

**4.** (1) Um wait state; o ciclo leva 4 estados, 80 ns. (2) Nenhum: com 100 ns por ciclo, o dado fica válido (em `max(45, 100 + 20) = 120` ns) antes da captura (200 ns). (3) 10 wait states: a CPU passa a maior parte do tempo esperando a memória. (4) X: a CPU capturou antes de o dado ficar válido.

**5.** (1) `5` é `0101`: A4 direto, A5 invertido, A6 direto, A7 invertido, e o EN (as entradas do decodificador de linha são A4 a A7). (2) Depende do conteúdo: é o bit 0 de `M[3A]`, que aparece na grade.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
