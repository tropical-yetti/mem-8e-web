# Os quatro níveis

Num circuito digital de livro, cada fio vale 0 ou 1. Num barramento de verdade, dois outros estados aparecem, e são justamente eles que explicam como vários circuitos dividem os mesmos fios. O simulador usa quatro níveis.

| Nível | Desenho                    | Significado                                        |
| ----- | -------------------------- | -------------------------------------------------- |
| **1** | linha cheia, na cor do fio | nível alto                                         |
| **0** | linha fina, apagada        | nível baixo                                        |
| **Z** | tracejado                  | ninguém está dirigindo o fio: ele está **solto**   |
| **X** | vermelho, listrado         | **indefinido**: pode ser 0 ou 1, não dá para saber |

## Z: alta impedância {#z}

Um **buffer tri-state** tem uma entrada de habilitação. Ligado, ele copia a entrada para a saída. Desligado, ele se desconecta: a saída não puxa o fio nem para 0 nem para 1. O fio fica em **alta impedância**, ou **Z**.

O BD fica em Z quando nem a CPU nem a memória estão com os seus buffers ligados. Isso é normal entre uma transação e outra.

Uma porta lógica comum com uma entrada solta pode ler qualquer coisa: por isso o simulador trata uma entrada em Z como X.

## X: indefinido {#x}

Um fio fica em **X** quando:

- **dois circuitos dirigem o mesmo fio com valores diferentes**: uma **contenção** (veja abaixo);
- quem dirige o fio recebeu uma entrada indefinida;
- uma célula guardou um valor que não estava definido (escrita com o BD solto, ou com um pulso de WR curto demais);
- o MDR capturou o BD antes de o dado ficar válido.

## Contenção {#contencao}

Se a CPU põe `0F` no BD e, ao mesmo tempo, a memória põe `00`, os 4 bits de baixo brigam: um lado puxa para 1, o outro para 0. Num circuito real, isso gasta corrente e pode até danificar os buffers. No simulador, esses bits ficam em X e as duas setas do BD aparecem.

Experimente: ligue **MDR → BD**, **CS** e **RD** juntos.

## Resolução de um fio {#resolucao}

Quando vários circuitos estão ligados ao mesmo fio, o valor dele segue esta regra:

- ninguém dirigindo (todos em Z): **Z**;
- só um dirigindo: o **valor dele**;
- vários dirigindo o mesmo valor: esse **valor**;
- vários dirigindo valores diferentes, ou algum X: **X**.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
