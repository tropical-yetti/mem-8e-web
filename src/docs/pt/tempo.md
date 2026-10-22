# Leitura, escrita e tempo

Até aqui, cada fase parecia acontecer na hora. Na prática, a memória leva um tempo para responder, e a CPU trabalha no ritmo do **clock**. Esta página mostra por que **o ciclo de memória não é o ciclo da CPU**.

## Fases de uma transação {#fases}

Os botões **Ler** e **Escrever** fazem uma transação completa, uma fase por clique em **Próxima fase**. A ordem das fases está em [Como a memória funciona](#/documentacao/memoria#ordem). Mexer à mão no MAR, no MDR ou nos sinais de controle no meio da transação a interrompe. Editar o conteúdo da memória, não.

## Os tempos da memória {#tempos}

Os tempos usados aqui são **didáticos**: não vêm de nenhum chip real.

| Tempo    | De                             | Até                                         |
| -------- | ------------------------------ | ------------------------------------------- |
| **t_AA** | o endereço ficar estável no BE | o dado ficar válido                         |
| **t_OE** | o RD ligar                     | o dado ficar válido no BD                   |
| **t_WP** | (duração mínima)               | o pulso de WR precisa durar pelo menos isso |

O simulador oferece três memórias:

| Memória | t_AA   | t_OE  | t_WP  |
| ------- | ------ | ----- | ----- |
| rápida  | 15 ns  | 8 ns  | 12 ns |
| média   | 45 ns  | 20 ns | 35 ns |
| lenta   | 120 ns | 50 ns | 90 ns |

E quatro clocks para a CPU: 10, 25, 50 e 100 MHz (períodos de 100, 40, 20 e 10 ns).

## Estados de clock {#estados}

A CPU divide uma leitura em **estados**, cada um com um período de clock:

- **T1**: o MAR põe o endereço no BE; no meio de T1, a CPU liga o CS;
- **T2**: o RD liga no começo de T2; **no fim de T2, a CPU captura o BD no MDR**;
- **T3**: no meio de T3, RD e CS desligam, e o BD volta a ficar solto.

O dado só fica válido em `max(t_AA, início de T2 + t_OE)`. Com o clock de 50 MHz e a memória média, isso dá `max(45, 20 + 20) = 45 ns`, mas a CPU quer capturar em 40 ns (fim de T2). Não dá tempo.

## Wait states {#wait-states}

Quando a memória ainda não terminou, ela segura o sinal **READY** em 0. A CPU, no fim de T2, vê o READY em 0 e **espera um ciclo inteiro**, sem fazer nada: é um **wait state** (Tw). Ela repete isso até o READY subir.

No exemplo acima, um wait state basta: a captura passa para 60 ns, depois dos 45 ns do dado. No diagrama de tempo, a faixa **Tw** aparece destacada, e o ciclo de leitura passa de 3 para 4 estados.

Repare: quanto **mais rápida** a CPU, **mais** wait states. Com a memória lenta, uma CPU de 100 MHz espera 10 ciclos em cada leitura. Uma memória lenta faz a CPU desperdiçar ciclos; por isso existem caches e memórias síncronas.

## Escrita {#escrita}

Na escrita, o WR liga no começo de T2 e desliga no começo de T3: um pulso de um período de clock. Se isso for menos que **t_WP**, a memória segura o READY em 0 e a CPU mantém o WR ligado por mais ciclos.

## Sem wait states {#sem-espera}

Desmarque **"A CPU espera a memória"** e escolha uma memória lenta:

- na **leitura**, a CPU captura no fim de T2 mesmo assim, com o dado ainda inválido: o **MDR fica com X**;
- na **escrita**, o pulso de WR é curto demais, e a **célula fica indefinida (X)**.

O resumo acima do diagrama mostra a leitura dando errado, a marca **MDR captura** fica vermelha, antes da marca **dado válido**.

## O diagrama de tempo {#diagrama}

O diagrama mostra, no mesmo eixo em nanossegundos:

- o **CLK** e as faixas dos estados (T1, T2, Tw, T3);
- **BE**, **CS**, **RD** ou **WR**, **READY** (quando a CPU espera) e **BD**;
- o **MDR** na leitura, ou a **célula** na escrita.

Nos barramentos, um hexágono com valor é um dado válido; listrado em vermelho é X; tracejado é Z. Sem transação, o diagrama mostra uma prévia da leitura do endereço do MAR. Durante uma transação, um cursor azul acompanha a fase atual.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
