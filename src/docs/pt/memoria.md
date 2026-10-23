# Como a memória funciona

A CPU nunca mexe na memória diretamente. Ela põe um endereço num registrador, liga alguns sinais de controle e espera o dado chegar (ou o entrega) por outro registrador. Esta página segue esse caminho, do endereço ao dado.

## Os dois registradores: MAR e MDR {#mar}

- O **MAR** (_Memory Address Register_) guarda o **endereço** da posição que vai ser lida ou escrita. Ele está sempre ligado ao barramento de endereços.
- O **MDR** (_Memory Data Register_) guarda o **dado**: o que veio da memória numa leitura, ou o que vai para ela numa escrita. (Nota: em algumas literaturas, o MDR também é chamado de **MBR**, ou _Memory Buffer Register_, tratando-se exatamente do mesmo registrador.)

O MAR e o MDR operam em conjunto para transferir palavras de dados de e para a memória, enquanto o PC (_Program Counter_) gerencia o fluxo de controle, apontando para as instruções do programa.

## Três grupos de fios {#barramentos}

| Grupo                            | Fios       | Sentido           | Quem dirige                            |
| -------------------------------- | ---------- | ----------------- | -------------------------------------- |
| Barramento de endereços (**BE**) | A7–A0      | CPU → memória     | sempre o MAR                           |
| Barramento de dados (**BD**)     | D7–D0      | nos dois sentidos | a CPU na escrita, a memória na leitura |
| Controle                         | CS, RD, WR | CPU → memória     | a unidade de controle da CPU           |

O BD é compartilhado: ora a CPU o dirige, ora a memória. Quando ninguém dirige, ele fica **solto** (alta impedância, Z). Veja [Os quatro níveis](#/documentacao/niveis).

## Sinais de controle {#controle}

- **CS** (_chip select_) liga a memória. Sem ele, nenhuma linha nem coluna é escolhida e nada acontece, mesmo com RD ou WR ligados.
- **RD** (_read_) liga os buffers de saída: o dado escolhido vai para o BD.
- **WR** (_write_) libera a escrita: a célula escolhida copia o que está no BD.

O CPU-8E esconde esses sinais. Aqui você pode ligá-los à mão, inclusive em combinações erradas, para ver o que acontece.

## RD e WR ao mesmo tempo {#rd-wr}

No simulador, ligar RD e WR juntos não dá prioridade a nenhum dos dois: os buffers de saída põem a célula no BD, e a mesma célula copia o BD.

- Se só a memória dirige o BD, a célula regrava o próprio valor, e nada muda na tela.
- Se a CPU também dirige o BD (MDR → BD), há contenção: onde o MDR e a célula discordam, o BD fica em X, e a célula guarda o X.

O modelo é assim de propósito, para o conflito ficar visível. **Em memórias reais**, é diferente:

- em muitas SRAMs assíncronas, WR ativo desliga os buffers de saída, e o chip só escreve;
- o controlador de memória da CPU nunca liga RD e WR ao mesmo tempo, e esse é o jeito certo de evitar o conflito.

O experimento “E se RD e WR forem ligados juntos?”, no botão **Experimentos “e se…?”** do simulador, mostra os dois casos passo a passo.

## A matriz: linha × coluna {#matriz}

As 256 posições não ficam numa fila. Elas formam uma **matriz de 16 linhas por 16 colunas**, e o endereço se divide em dois:

- **A7–A4** (o primeiro dígito hexadecimal) escolhem a **linha**;
- **A3–A0** (o segundo dígito) escolhem a **coluna**.

O endereço `3A` está na linha `3`, coluna `A`. É por isso que a grade do simulador tem 16 linhas e 16 colunas: ela é a própria matriz.

Por que matriz? Um decodificador direto de 8 para 256 precisaria de 256 portas AND de 8 entradas e de 256 fios saindo dele. Com a matriz, são dois decodificadores de 4 para 16: 32 portas pequenas e 32 fios.

## Decodificadores {#decodificadores}

Um **decodificador 4 → 16** recebe 4 bits e liga **exatamente uma** de suas 16 saídas: a de número igual à entrada. A entrada `0011` liga a saída 3, e nenhuma outra.

Os dois decodificadores só funcionam com o **CS** ligado (entrada EN). O de linha liga uma **linha de palavra**, e o de coluna escolhe a coluna no seletor. A página [Em portas lógicas](#/documentacao/portas#decodificador) mostra um decodificador por dentro.

## Linhas de bit e seletor {#linhas-de-bit}

Quando uma linha de palavra liga, **a linha inteira é lida**: os 16 bytes dela descem pelas **linhas de bit**, uma por coluna. Na vista "Por dentro", embaixo da grade, aparecem esses 16 bytes.

O **seletor de coluna** (um multiplexador 16 → 1) usa a saída do decodificador de coluna para escolher um desses 16 bytes. Só esse byte segue adiante.

Ler a linha inteira parece desperdício, mas é assim que as memórias reais funcionam, e é a base das memórias síncronas e da DDR: depois de "abrir" uma linha, ler outras colunas da mesma linha é rápido.

## Buffers de saída (tri-state) {#buffers}

Entre o seletor e o BD ficam os **buffers tri-state**. Eles têm dois modos:

- **ligados** (CS · RD = 1): copiam o dado para o BD;
- **desligados**: se desconectam do fio, que fica em **Z**.

É isso que permite à CPU e à memória dividirem o mesmo BD: quem não está falando se desliga.

## Escrita {#escrita}

Na escrita, o caminho é o inverso. A CPU liga os **seus** buffers e põe o MDR no BD. Com **CS** e **WR** ligados, só a célula no cruzamento da linha e da coluna escolhidas copia o BD.

Cada bit da célula é um **latch D**. Enquanto a escrita está liberada, ele segue a entrada; quando o WR desliga, guarda o último valor. Se o BD estiver solto durante a escrita, a célula guarda um valor indefinido (X).

## Leitura e escrita, em ordem {#ordem}

| Leitura                               | Escrita                               |
| ------------------------------------- | ------------------------------------- |
| 1. MAR → BE                           | 1. MAR → BE                           |
| 2. CS liga: linha e coluna escolhidas | 2. CPU põe o MDR no BD                |
| 3. RD liga: o dado vai para o BD      | 3. CS liga: linha e coluna escolhidas |
| 4. O MDR copia o BD                   | 4. WR liga: a célula copia o BD       |
| 5. RD e CS desligam: BD solto         | 5. WR desliga: o valor fica guardado  |
|                                       | 6. CS desliga, CPU solta o BD         |

A página [Leitura, escrita e tempo](#/documentacao/tempo) mostra quanto tempo cada fase leva.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
