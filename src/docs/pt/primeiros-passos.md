# Primeiros passos

O MEM-8E Web mostra o que acontece **dentro** da memória quando a CPU lê ou escreve. A memória tem 256 posições de 8 bits, endereços `00` a `FF`, como a da [CPU-8E](https://tropical-yetti.github.io/cpu-8e-web/). Esta página leva uns cinco minutos.

## 1. Escolha um endereço {#endereco}

No painel da esquerda, o **MAR** guarda o endereço que a CPU quer acessar. Digite `3A` no campo do MAR, ou clique nos bits embaixo dele.

Repare em duas coisas:

- os bits estão divididos em dois grupos de quatro: **linha** (A7–A4) e **coluna** (A3–A0). Em `3A`, a linha é `3` e a coluna é `A`;
- na grade da direita, a posição `3A` (linha 3, coluna A) ganha um contorno.

Você também pode clicar direto numa posição da grade: o endereço dela vai para o MAR.

## 2. Ligue a memória e leia {#ler-a-mao}

Ligue o **CS** (chip select). Os decodificadores respondem: a linha 3 e a coluna A acendem na grade, e embaixo dela o **seletor de coluna** mostra o dado escolhido. O barramento de dados (**BD**) ainda está solto, tracejado: os buffers de saída estão desligados.

Agora ligue o **RD** (leitura). Os buffers ligam, e o dado aparece no BD, com a seta saindo da memória em direção à CPU.

## 3. Uma leitura fase a fase {#transacao}

Desligue CS e RD e use o botão **Ler o endereço 3A**. A leitura acontece em fases, uma por clique em **Próxima fase**, e o texto explica cada uma. Na fase **MDR captura**, o MDR recebe o dado.

Com os tempos padrão aparece uma fase **Wait state**: a memória é mais lenta que a CPU, e a CPU espera. O [diagrama de tempo](#/documentacao/tempo) explica por quê.

## 4. Escreva um valor {#escrever}

Digite `C7` no **MDR** e use **Escrever C7 no endereço 3A**. Avance as fases e veja a célula `3A` mudar quando o **WR** liga.

## 5. Provoque um erro {#erro}

Ligue ao mesmo tempo **MDR → BD**, **CS** e **RD**: a CPU e a memória dirigem o BD juntas. Os bits em que elas discordam ficam em **X**, em vermelho: é uma **contenção**. A página [Os quatro níveis](#/documentacao/niveis) explica o que isso significa.

## 6. Guarde e compartilhe a memória {#arquivo}

Embaixo da grade ficam os botões **Abrir arquivo**, **Salvar arquivo**, **Colar texto** e **Copiar texto**. O conteúdo da memória vira um texto simples, que dá para abrir em qualquer editor, mandar por e-mail ou pôr num roteiro de aula:

```text
# comentários começam com # ou ;
00: 3A 10 C4 FF
10: 2A XX 00
F0: 1X0X0001
```

- Cada linha pode começar com um **endereço** em hexadecimal e dois-pontos. Sem ele, os bytes continuam de onde a linha anterior parou; o primeiro vai para `00`.
- Cada **byte** tem 2 dígitos hexadecimais. `XX` é uma célula indefinida, e 8 dígitos `0`, `1` ou `X` (do bit 7 ao bit 0) descrevem uma célula com só alguns bits indefinidos.
- **Abrir substitui a memória inteira:** as posições que o texto não cita ficam em `00`.
- Um texto com erro **não muda nada**. A mensagem diz a linha e a coluna do problema: um byte inválido, um endereço depois de `FF` ou uma posição que aparece duas vezes.
- **Salvar** escreve as 256 posições em 16 linhas de 16 bytes. Abrir esse arquivo de volta dá exatamente a mesma memória, inclusive os X.

Os arquivos `.bin` do CPU-8E não abrem aqui: eles são programas, e o MEM-8E só mostra a memória, sem executar nada.

## Para continuar

- [Como a memória funciona](#/documentacao/memoria): cada bloco, do endereço ao dado.
- [Em portas lógicas](#/documentacao/portas): o mesmo circuito, porta por porta.
- [Roteiro de aula](#/documentacao/roteiro): exercícios para fazer no simulador.

O botão **Ver o guia**, na página do simulador, mostra de novo os balões de apresentação. Cada seção também tem um botão **?** com a explicação só daquela parte, e passar o mouse (ou o foco) sobre uma sigla mostra o nome completo dela.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
