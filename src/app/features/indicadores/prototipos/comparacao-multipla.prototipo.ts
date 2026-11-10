/**
 * FE11 — protótipo de descoberta da comparação múltipla.
 *
 * Tudo aqui é FICTÍCIO e local: não há endpoint (BE11 é só proposta). Os valores são
 * gerados de forma determinística a partir do código da entidade, apenas para
 * demonstrar seleção, legenda, tooltip e estados. Regras seguidas (DAD07, preliminar):
 * - até 3 alvos manuais no total (escolas e municípios misturados);
 * - cada escola gera uma referência municipal automática, tracejada, fora do limite;
 * - não existe média conjunta entre municípios;
 * - ano sem dado interrompe só a linha daquela série (sem NULL → 0).
 */
import type { PlotlyFigure } from '../../../core/api/models/plotly-figure';

export const LIMITE_ALVOS = 3;
export const ANOS_PROTOTIPO = [2022, 2023, 2024, 2025] as const;
export const LIMIAR_COBERTURA_ESCOLA = 60;

export type TipoAlvo = 'escola' | 'municipio';

export interface AlvoComparacao {
  tipo: TipoAlvo;
  codigo: number;
  nome: string;
  /** Município da escola (para a referência automática). */
  municipio?: string | null;
}

export type TipoSerie = 'escola' | 'municipio' | 'referencia';

export interface PontoSerie {
  ano: number;
  valor: number | null;
  /** Cobertura dos indicadores da escola (só séries de escola). */
  cobertura: number | null;
}

export interface SerieComparacao {
  id: string;
  tipo: TipoSerie;
  nome: string;
  /** Legenda exibida. */
  legenda: string;
  /** Escola vinculada (só referência automática). */
  escolaVinculada?: string;
  municipio?: string | null;
  cor: string;
  pontos: PontoSerie[];
}

/** Estados simulados para demonstrar o comportamento da interface. */
export type CenarioPrototipo = 'dados' | 'carregando' | 'erro' | 'sem_dados' | 'baixa_cobertura';

/** Paleta Okabe-Ito (segura para daltonismo); cada alvo manual recebe uma cor. */
const CORES = ['#0072B2', '#D55E00', '#009E73'] as const;

export const idAlvo = (a: Pick<AlvoComparacao, 'tipo' | 'codigo'>) => `${a.tipo}:${a.codigo}`;

export type ResultadoAdicao =
  | { ok: true; alvos: AlvoComparacao[] }
  | { ok: false; motivo: 'limite' | 'duplicado'; alvos: AlvoComparacao[] };

/** Adiciona preservando a ordem; bloqueia o 4º alvo e o alvo repetido. */
export function adicionarAlvo(alvos: AlvoComparacao[], novo: AlvoComparacao): ResultadoAdicao {
  if (alvos.some((a) => idAlvo(a) === idAlvo(novo)))
    return { ok: false, motivo: 'duplicado', alvos };
  if (alvos.length >= LIMITE_ALVOS) return { ok: false, motivo: 'limite', alvos };
  return { ok: true, alvos: [...alvos, novo] };
}

/** Remover uma escola remove também sua referência automática (que é derivada dela). */
export function removerAlvo(alvos: AlvoComparacao[], id: string): AlvoComparacao[] {
  return alvos.filter((a) => idAlvo(a) !== id);
}

/** Pseudoaleatório determinístico a partir de um código (mesmo alvo → mesmos valores). */
function gerador(semente: number): () => number {
  let s = semente % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const arredondar = (v: number) => Math.round(v * 100) / 100;

function serieFicticia(codigo: number, base: number, cenario: CenarioPrototipo, escola: boolean) {
  const r = gerador(codigo);
  const inicio = base + r() * 30;
  return ANOS_PROTOTIPO.map((ano, i): PontoSerie => {
    const valor = arredondar(Math.min(100, Math.max(0, inicio + i * (r() * 8 - 2))));
    let cobertura = escola ? arredondar(70 + r() * 30) : null;
    if (cenario === 'sem_dados') return { ano, valor: null, cobertura: escola ? 0 : null };
    if (cenario === 'baixa_cobertura' && escola && i >= 2) cobertura = 47.06; // 8 de 17
    // Uma lacuna fictícia em 2024 na primeira escola demonstra a linha interrompida.
    if (escola && i === 2 && codigo % 2 === 1) return { ano, valor: null, cobertura: null };
    return { ano, valor, cobertura };
  });
}

/** Séries do gráfico: alvos na ordem escolhida, cada escola seguida da sua referência. */
export function montarSeries(
  alvos: AlvoComparacao[],
  cenario: CenarioPrototipo,
): SerieComparacao[] {
  return alvos.flatMap((alvo, i): SerieComparacao[] => {
    const cor = CORES[i % CORES.length];
    if (alvo.tipo === 'municipio') {
      return [
        {
          id: idAlvo(alvo),
          tipo: 'municipio',
          nome: alvo.nome,
          legenda: `Município: ${alvo.nome}`,
          cor,
          pontos: serieFicticia(alvo.codigo, 45, cenario, false),
        },
      ];
    }
    return [
      {
        id: idAlvo(alvo),
        tipo: 'escola',
        nome: alvo.nome,
        legenda: `Escola: ${alvo.nome}`,
        municipio: alvo.municipio,
        cor,
        pontos: serieFicticia(alvo.codigo, 40, cenario, true),
      },
      {
        id: `referencia:${alvo.codigo}`,
        tipo: 'referencia',
        nome: alvo.municipio ?? 'Município não informado',
        legenda: `Referência municipal da ${alvo.nome}`,
        escolaVinculada: alvo.nome,
        municipio: alvo.municipio,
        cor,
        pontos: serieFicticia(alvo.codigo + 7, 45, cenario, false),
      },
    ];
  });
}

/** Escolas com cobertura de indicadores abaixo de 60% em algum ano (alerta só da escola). */
export function escolasComCoberturaBaixa(
  series: SerieComparacao[],
): { nome: string; anos: number[] }[] {
  return series
    .filter((s) => s.tipo === 'escola')
    .map((s) => ({
      nome: s.nome,
      anos: s.pontos
        .filter(
          (p) => p.cobertura !== null && p.cobertura < LIMIAR_COBERTURA_ESCOLA && p.valor !== null,
        )
        .map((p) => p.ano),
    }))
    .filter((e) => e.anos.length > 0);
}

export const temAlgumDado = (series: SerieComparacao[]) =>
  series.some((s) => s.pontos.some((p) => p.valor !== null));

const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatarValor = (v: number | null) => (v === null ? 'Sem dados' : `${fmt.format(v)}%`);

const ROTULO_TIPO: Record<TipoSerie, string> = {
  escola: 'Escola selecionada',
  municipio: 'Município selecionado (todas as escolas)',
  referencia: 'Referência automática (demais escolas do município)',
};

export function textoTooltip(s: SerieComparacao, p: PontoSerie): string {
  const linhas = [`<b>${s.legenda}</b>`, `Ano: ${p.ano}`, `Índice: ${formatarValor(p.valor)}`];
  linhas.push(`Tipo: ${ROTULO_TIPO[s.tipo]}`);
  if (s.tipo === 'referencia') {
    linhas.push(`Escola vinculada: ${s.escolaVinculada}`, `Município histórico: ${s.nome}`);
  }
  if (s.tipo === 'escola' && p.cobertura !== null) {
    const alerta = p.cobertura < LIMIAR_COBERTURA_ESCOLA ? ' ⚠ cobertura baixa' : '';
    linhas.push(`Cobertura dos indicadores: ${formatarValor(p.cobertura)}${alerta}`);
  }
  return linhas.join('<br>');
}

/** Escola: contínua com círculos; município: contínua com quadrados; referência: tracejada. */
export function montarFiguraMultipla(series: SerieComparacao[]): PlotlyFigure {
  return {
    data: series.map((s) => ({
      type: 'scatter',
      mode: 'lines+markers',
      name: s.legenda,
      x: s.pontos.map((p) => p.ano),
      y: s.pontos.map((p) => p.valor),
      connectgaps: false,
      text: s.pontos.map((p) => textoTooltip(s, p)),
      hovertemplate: '%{text}<extra></extra>',
      line: {
        color: s.cor,
        width: s.tipo === 'referencia' ? 2 : 3,
        dash: s.tipo === 'referencia' ? 'dash' : 'solid',
      },
      marker: {
        color: s.tipo === 'referencia' ? '#fff' : s.cor,
        size: s.tipo === 'referencia' ? 7 : 9,
        symbol: s.tipo === 'municipio' ? 'square' : 'circle',
        line: { color: s.cor, width: 2 },
      },
    })),
    layout: {
      margin: { t: 16, r: 16, b: 48, l: 56 },
      hovermode: 'closest',
      hoverlabel: { bgcolor: '#fff', bordercolor: '#cbd6e4', font: { color: '#0b2454' } },
      legend: { orientation: 'h', y: -0.18, font: { size: 12 } },
      xaxis: { title: { text: 'Ano' }, tickvals: [...ANOS_PROTOTIPO], fixedrange: true },
      yaxis: {
        title: { text: 'Percentual de recursos' },
        range: [0, 100],
        ticksuffix: '%',
        fixedrange: true,
        gridcolor: '#e8eef6',
      },
      plot_bgcolor: '#fff',
      paper_bgcolor: '#fff',
    },
  } as PlotlyFigure;
}
