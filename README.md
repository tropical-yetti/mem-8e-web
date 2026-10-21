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

Versão 0.1: só a estrutura do site. Veja o [plano do projeto](docs/PLANO.md)
e as [decisões de arquitetura](docs/adr/).

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
