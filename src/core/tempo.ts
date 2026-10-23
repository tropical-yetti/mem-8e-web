/**
 * Modelo de tempo (ADR 0003): o ciclo de memória não é o ciclo da CPU.
 *
 * A CPU trabalha em estados de clock (T1, T2, T3). A memória tem os próprios
 * tempos, genéricos e didáticos (não são de nenhum chip real):
 *
 * - t_AA: do endereço estável no BE até o dado válido;
 * - t_OE: do RD ligado até o dado válido no BD;
 * - t_WP: largura mínima do pulso de WR para a célula guardar o dado.
 *
 * Leitura (memória assíncrona, tipo SRAM):
 *
 *   T1: o MAR põe o endereço no BE (t = 0) e, no meio de T1, a CPU liga o CS.
 *   T2: a CPU liga o RD no começo de T2. No fim de T2 ela captura o BD no MDR.
 *   Tw: se a memória ainda não terminou, ela segura o READY em 0 e a CPU
 *       espera um ciclo inteiro (wait state), quantas vezes for preciso.
 *   T3: no meio de T3, RD e CS desligam e o BD volta a ficar solto.
 *
 * Escrita: endereço em T1, dado no BD no primeiro quarto de T1, CS no meio de
 * T1; WR fica ligado de T2 até o começo de T3 (com wait states, se a memória
 * pedir); no meio de T3, CS desliga e a CPU solta o BD.
 *
 * Sem wait states, uma memória lenta demais dá errado: na leitura o MDR
 * captura um BD que ainda não tem o dado (X); na escrita o pulso de WR é curto
 * demais e a célula fica indefinida.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Tempos em nanossegundos. */
export interface ParametrosTempo {
  /** Período do clock da CPU. */
  periodo: number
  tAA: number
  tOE: number
  tWP: number
  /** A CPU obedece ao READY e insere wait states. */
  esperar: boolean
}

export interface TemposMemoria {
  tAA: number
  tOE: number
  tWP: number
}

/** Três memórias de exemplo, de rápida a lenta. */
export const MEMORIAS = {
  rapida: { tAA: 15, tOE: 8, tWP: 12 },
  media: { tAA: 45, tOE: 20, tWP: 35 },
  lenta: { tAA: 120, tOE: 50, tWP: 90 },
} as const satisfies Record<string, TemposMemoria>

export type TipoMemoria = keyof typeof MEMORIAS

/** Clocks de exemplo, em MHz (período = 1000 / MHz ns). */
export const CLOCKS_MHZ = [10, 25, 50, 100] as const

export function periodoDe(mhz: number): number {
  return 1000 / mhz
}

export const TEMPO_PADRAO: ParametrosTempo = {
  periodo: periodoDe(50),
  ...MEMORIAS.media,
  esperar: true,
}

/**
 * Quando o dado fica válido no BD, numa leitura. Se o endereço mudou no meio
 * (em `mudancaEndereco`), a contagem de t_AA recomeça dali (ADR 0005).
 */
export function dadoValidoEm(p: ParametrosTempo, mudancaEndereco = 0): number {
  // O RD liga no começo de T2 (t = periodo).
  return Math.max(mudancaEndereco + p.tAA, p.periodo + p.tOE)
}

/** Instante em que o MDR captura o BD, numa leitura. */
export function capturaEm(p: ParametrosTempo): number {
  return (2 + esperasLeitura(p)) * p.periodo
}

/**
 * Wait states de uma leitura: quantos ciclos a mais até o dado ficar válido.
 * São decididos no começo do ciclo; uma troca de endereço depois não os muda.
 */
export function esperasLeitura(p: ParametrosTempo): number {
  if (!p.esperar) return 0
  return Math.max(0, Math.ceil((dadoValidoEm(p) - 2 * p.periodo) / p.periodo))
}

/** Wait states de uma escrita: quantos ciclos a mais até o pulso de WR bastar. */
export function esperasEscrita(p: ParametrosTempo): number {
  if (!p.esperar) return 0
  return Math.max(0, Math.ceil((p.tWP - p.periodo) / p.periodo))
}

/**
 * A leitura dá certo: o dado está válido quando o MDR captura. Uma troca de
 * endereço depois da captura não atrapalha a leitura que já foi feita.
 */
export function leituraCerta(p: ParametrosTempo, mudancaEndereco = 0): boolean {
  const captura = capturaEm(p)
  const mudanca = mudancaEndereco > captura ? 0 : mudancaEndereco
  return dadoValidoEm(p, mudanca) <= captura
}

/** Instante de cada fase de uma leitura, no diagrama de tempo. */
export function instantesLeitura(p: ParametrosTempo): Record<string, number> {
  const P = p.periodo
  const captura = capturaEm(p)
  return {
    endereco: 0,
    selecao: P / 2,
    saida: P,
    espera: 2 * P,
    captura,
    liberacao: captura + P / 2,
  }
}

/** A escrita dá certo: o pulso de WR é pelo menos t_WP. */
export function escritaCerta(p: ParametrosTempo): boolean {
  return (1 + esperasEscrita(p)) * p.periodo >= p.tWP
}

// ---------------------------------------------------------------------------
// Linha do tempo, para o diagrama
// ---------------------------------------------------------------------------

/** Valor de um sinal num trecho: um nível, ou o texto de um barramento (por exemplo, "3A"). */
export type ValorTrecho = 0 | 1 | 'Z' | 'X' | string

export interface Trecho {
  de: number
  ate: number
  valor: ValorTrecho
}

export type IdSinal = 'clk' | 'be' | 'cs' | 'rd' | 'wr' | 'ready' | 'bd' | 'mdr' | 'celula'

export interface SinalNoTempo {
  id: IdSinal
  tipo: 'bit' | 'barramento'
  trechos: Trecho[]
}

export interface EstadoClock {
  nome: 'T1' | 'T2' | 'Tw' | 'T3'
  de: number
  ate: number
}

export type IdMarca = 'dadoValido' | 'captura' | 'pulsoMinimo' | 'fimPulso' | 'mudancaEndereco'

export interface Marca {
  id: IdMarca
  t: number
}

export interface LinhaDoTempo {
  tipo: 'ler' | 'escrever'
  periodo: number
  fim: number
  esperas: number
  certo: boolean
  sinais: SinalNoTempo[]
  estados: EstadoClock[]
  marcas: Marca[]
  /** Instante de cada fase da transação passo a passo. */
  instantes: Record<string, number>
  /** O endereço mudou no meio da leitura (ADR 0005). */
  mudanca?: MudancaEndereco
}

export interface MudancaEndereco {
  /** Quando o MAR mudou. */
  t: number
  /** Novo endereço e o conteúdo dele, em hexadecimal. */
  endereco: string
  dado: string
}

/** Junta trechos vizinhos com o mesmo valor e descarta trechos vazios. */
function trechos(lista: Trecho[]): Trecho[] {
  const saida: Trecho[] = []
  for (const trecho of lista) {
    if (trecho.ate <= trecho.de) continue
    const ultimo = saida[saida.length - 1]
    if (ultimo && ultimo.valor === trecho.valor && ultimo.ate === trecho.de) ultimo.ate = trecho.ate
    else saida.push({ ...trecho })
  }
  return saida
}

function clock(periodo: number, fim: number): SinalNoTempo {
  const lista: Trecho[] = []
  for (let t = 0; t < fim; t += periodo) {
    lista.push({ de: t, ate: t + periodo / 2, valor: 1 })
    lista.push({ de: t + periodo / 2, ate: t + periodo, valor: 0 })
  }
  return { id: 'clk', tipo: 'bit', trechos: trechos(lista) }
}

function estadosClock(periodo: number, esperas: number): EstadoClock[] {
  const nomes: EstadoClock['nome'][] = ['T1', 'T2', ...Array<'Tw'>(esperas).fill('Tw'), 'T3']
  return nomes.map((nome, i) => ({ nome, de: i * periodo, ate: (i + 1) * periodo }))
}

/** Um sinal que liga em `liga` e desliga em `desliga`. */
function pulso(id: IdSinal, liga: number, desliga: number, fim: number): SinalNoTempo {
  return {
    id,
    tipo: 'bit',
    trechos: trechos([
      { de: 0, ate: liga, valor: 0 },
      { de: liga, ate: desliga, valor: 1 },
      { de: desliga, ate: fim, valor: 0 },
    ]),
  }
}

/** READY: a memória o segura em 0 enquanto ainda não terminou. */
function ready(espera: number, pronto: number, fim: number): SinalNoTempo {
  return {
    id: 'ready',
    tipo: 'bit',
    trechos: trechos([
      { de: 0, ate: espera, valor: 1 },
      { de: espera, ate: Math.min(pronto, fim), valor: 0 },
      { de: Math.min(pronto, fim), ate: fim, valor: 1 },
    ]),
  }
}

export interface DadosLeitura {
  /** Endereço, em hexadecimal. */
  endereco: string
  /** Conteúdo da posição (o dado que vai aparecer no BD). */
  dado: string
  /** MDR antes da leitura. */
  mdrAntes: string
}

export function linhaDoTempoLeitura(
  p: ParametrosTempo,
  d: DadosLeitura,
  mudanca?: MudancaEndereco,
): LinhaDoTempo {
  const P = p.periodo
  const esperas = esperasLeitura(p)
  const captura = capturaEm(p)
  const desliga = captura + P / 2
  const fim = (3 + esperas) * P
  const valido = dadoValidoEm(p)
  const certo = leituraCerta(p, mudanca?.t)

  // O BD de uma leitura: solto, inválido até o dado chegar, o dado, solto de novo.
  let bd: Trecho[] = [
    { de: 0, ate: P, valor: 'Z' },
    // Os buffers ligam com o RD, mas o dado ainda não chegou: o BD é dirigido, porém inválido.
    { de: P, ate: Math.min(valido, desliga), valor: 'X' },
    { de: Math.min(valido, desliga), ate: desliga, valor: d.dado },
    { de: desliga, ate: fim, valor: 'Z' },
  ]
  let be: Trecho[] = [{ de: 0, ate: fim, valor: d.endereco }]
  let validoFinal = valido
  /** O que o MDR guarda na captura (antes do X de uma leitura errada). */
  let dadoCapturado = d.dado
  if (mudanca) {
    const tm = Math.min(mudanca.t, fim)
    be = [
      { de: 0, ate: tm, valor: d.endereco },
      { de: tm, ate: fim, valor: mudanca.endereco },
    ]
    // Com os buffers ligados, o BD fica inválido de novo até o novo dado chegar.
    const novoValido = dadoValidoEm(p, tm)
    const antes = bd.map((tr) => ({ ...tr, ate: Math.min(tr.ate, tm) }))
    const depois: Trecho[] =
      tm < desliga
        ? [
            { de: Math.max(tm, P), ate: Math.min(novoValido, desliga), valor: 'X' },
            { de: Math.min(novoValido, desliga), ate: desliga, valor: mudanca.dado },
            { de: desliga, ate: fim, valor: 'Z' },
          ]
        : [{ de: tm, ate: fim, valor: 'Z' }]
    // Antes do RD (tm < P), o trecho Z do começo continua até o RD.
    if (tm < P) depois.unshift({ de: tm, ate: P, valor: 'Z' })
    bd = [...antes, ...depois]
    if (tm <= captura) {
      validoFinal = novoValido
      dadoCapturado = mudanca.dado
    }
  }

  const sinais: SinalNoTempo[] = [
    clock(P, fim),
    { id: 'be', tipo: 'barramento', trechos: trechos(be) },
    pulso('cs', P / 2, desliga, fim),
    pulso('rd', P, desliga, fim),
  ]
  // O READY foi decidido no começo do ciclo, pelo endereço original.
  if (p.esperar) sinais.push(ready(P, valido, fim))
  sinais.push(
    { id: 'bd', tipo: 'barramento', trechos: trechos(bd) },
    {
      id: 'mdr',
      tipo: 'barramento',
      trechos: trechos([
        { de: 0, ate: captura, valor: d.mdrAntes },
        { de: captura, ate: fim, valor: certo ? dadoCapturado : 'X' },
      ]),
    },
  )

  return {
    tipo: 'ler',
    periodo: P,
    fim,
    esperas,
    certo,
    sinais,
    estados: estadosClock(P, esperas),
    marcas: [
      ...(mudanca ? [{ id: 'mudancaEndereco' as const, t: Math.min(mudanca.t, fim) }] : []),
      { id: 'dadoValido', t: validoFinal },
      { id: 'captura', t: captura },
    ],
    instantes: instantesLeitura(p),
    ...(mudanca ? { mudanca } : {}),
  }
}

export interface DadosEscrita {
  endereco: string
  /** Dado que a CPU põe no BD (o MDR). */
  dado: string
  /** Conteúdo da posição antes da escrita. */
  celulaAntes: string
}

export function linhaDoTempoEscrita(p: ParametrosTempo, d: DadosEscrita): LinhaDoTempo {
  const P = p.periodo
  const esperas = esperasEscrita(p)
  const ligaWr = P
  const desligaWr = (2 + esperas) * P
  const libera = desligaWr + P / 2
  const fim = (3 + esperas) * P
  const certo = desligaWr - ligaWr >= p.tWP

  const sinais: SinalNoTempo[] = [
    clock(P, fim),
    { id: 'be', tipo: 'barramento', trechos: [{ de: 0, ate: fim, valor: d.endereco }] },
    pulso('cs', P / 2, libera, fim),
    pulso('wr', ligaWr, desligaWr, fim),
  ]
  if (p.esperar) sinais.push(ready(ligaWr, ligaWr + p.tWP, fim))
  sinais.push(
    {
      id: 'bd',
      tipo: 'barramento',
      trechos: trechos([
        { de: 0, ate: P / 4, valor: 'Z' },
        { de: P / 4, ate: libera, valor: d.dado },
        { de: libera, ate: fim, valor: 'Z' },
      ]),
    },
    {
      id: 'celula',
      tipo: 'barramento',
      trechos: trechos([
        { de: 0, ate: ligaWr, valor: d.celulaAntes },
        // O latch é transparente: com WR ligado, a célula já segue o BD.
        { de: ligaWr, ate: fim, valor: certo ? d.dado : 'X' },
      ]),
    },
  )

  return {
    tipo: 'escrever',
    periodo: P,
    fim,
    esperas,
    certo,
    sinais,
    estados: estadosClock(P, esperas),
    marcas: [
      { id: 'pulsoMinimo', t: ligaWr + p.tWP },
      { id: 'fimPulso', t: desligaWr },
    ],
    instantes: {
      endereco: 0,
      dado: P / 4,
      selecao: P / 2,
      escrita: ligaWr,
      espera: 2 * P,
      fimEscrita: desligaWr,
      liberacao: libera,
    },
  }
}
