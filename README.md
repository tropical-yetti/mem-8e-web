# MEM-8E Web

Simulador educacional que mostra, por dentro, como funciona a memória do
computador, no navegador, em português e inglês.

Coloque um endereço no barramento de endereços e veja os decodificadores de
linha e de coluna escolherem uma posição entre 256, o dado chegar ao barramento
de dados e os sinais de controle (CS, RD, WR) e de tempo trabalharem juntos.

É um projeto irmão do [CPU-8E Web](https://github.com/tropical-yetti/cpu-8e-web):
a memória tem a mesma arquitetura de 8 bits e os mesmos nomes (MAR, MDR, BE, BD)
da CPU-8E, mas aqui ela deixa de ser uma caixa-preta.

**Use no navegador:** <https://tropical-yetti.github.io/mem-8e-web/> (em
construção)

## Situação

Já dá para editar o MAR, o MDR e a memória, ligar CS, RD e WR à mão e ver
leituras e escritas fase a fase, com a memória aberta: decodificadores,
matriz, seletor e buffers, e o detalhe em portas lógicas de um bit e dos
decodificadores, e o diagrama de tempo com o clock da CPU e os wait states. Veja o [plano do projeto](docs/PLANO.md) e as
[decisões de arquitetura](docs/adr/).

## Desenvolvimento

Requer Node.js 22.

```sh
npm install
npm run dev        # servidor local
npm test           # testes
npm run build      # versão de produção em dist/
```

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para as regras do projeto.

## Licença

[GPL-3.0-or-later](LICENSE). Autoria e créditos em [NOTICE.md](NOTICE.md).
