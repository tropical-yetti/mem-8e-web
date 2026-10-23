# Avisos de autoria e licença

```
MEM-8E Web
Copyright (C) 2026 Ansone e colaboradores do MEM-8E Web

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option)
any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
more details.
```

A licença é a **GPL-3.0-or-later**. O texto integral está em [LICENSE](LICENSE).

## Relação com o CPU-8E e o CPU-8E Web

O MEM-8E Web é um projeto irmão do
[CPU-8E Web](https://github.com/tropical-yetti/cpu-8e-web), que por sua vez é
a versão para navegador do simulador [CPU-8E](https://github.com/wanderlan/cpu-8e),
criado no IESB – Instituto de Educação Superior de Brasília pelo
[Prof. Joel Guilherme da Silva Filho](http://lattes.cnpq.br/7746085908957322)
e colaboradores.

- Do **CPU-8E** vêm a arquitetura de 8 bits com memória de 256 bytes e os
  nomes dos registradores e barramentos (MAR, MDR, BE, BD). O formato dos
  programas `.bin` não é usado: a memória é guardada em texto
  ([ADR 0006](docs/adr/0006-arquivo-de-memoria-em-texto.md)).
- Do **CPU-8E Web** vêm a estrutura do site, o estilo, as configurações e as
  ferramentas de teste (ver [ADR 0004](docs/adr/0004-reaproveitamento-do-cpu-8e-web.md)).

Um arquivo copiado de um arquivo do CPU-8E Web que deriva do CPU-8E original
traz no cabeçalho o nome do arquivo de origem e o aviso de copyright original:

```
CPU-8E Simulator
Copyright 2009/10 Joel Guilherme da Silva Filho (http://lattes.cnpq.br/7746085908957322)
```

Na versão atual, nenhum arquivo deriva do original, e nenhum arquivo do
CPU-8E original é incluído. (Até a 0.9, os programas de exemplo `teste.bin` e
`allopcodes.bin` eram usados como dados de teste; saíram na 1.0.)

## Modificações

Todas as mudanças, com data, estão em [CHANGELOG.md](CHANGELOG.md).
