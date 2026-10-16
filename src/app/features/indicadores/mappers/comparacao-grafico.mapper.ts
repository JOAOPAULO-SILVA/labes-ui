import { PlotlyFigure } from '../../../core/api/models/plotly-figure';
import {
  PontoComparacaoMunicipioModel,
  SerieGraficoComparacaoModel,
  SituacaoComparacaoMunicipioModel,
} from '../models/infraestrutura.models';

/** Textos exibidos no gráfico, no tooltip e no resumo. Centralizados para revisão. */
export const TEXTOS_COMPARACAO = {
  serieEscola: 'Escola',
  serieMunicipio: 'Média municipal',
  eixoY: 'Índice (%)',
  eixoX: 'Ano do Censo Escolar',
  semDado: '—',
  resumo: {
    ano: 'Ano',
    indiceEscola: 'Índice da escola',
    mediaMunicipal: 'Média municipal',
    diferenca: 'Diferença',
    pares: 'Pares válidos',
    indicadores: 'Indicadores válidos',
  },
  situacao: {
    disponivel: '',
    escola_sem_dados: 'A escola não tem dados neste ano.',
    sem_pares_validos: 'Nenhuma outra escola do município tem dados válidos neste ano.',
    sem_pares_municipio: 'Não há outras escolas no município neste ano.',
  } satisfies Record<SituacaoComparacaoMunicipioModel, string>,
} as const;

const CORES = {
  escola: '#075be8',
  municipio: '#1aa36f',
  texto: '#26395f',
  grade: '#e4ebf4',
};

const formatoNumero = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatarPercentual(valor: number | null): string {
  return valor === null ? TEXTOS_COMPARACAO.semDado : `${formatoNumero.format(valor)}%`;
}

export function formatarPontosPercentuais(valor: number | null): string {
  if (valor === null) return TEXTOS_COMPARACAO.semDado;
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : '';
  return `${sinal}${formatoNumero.format(Math.abs(valor))} p.p.`;
}

export function formatarParcial(parte: number, total: number): string {
  return `${parte} de ${total}`;
}

/** Linhas do tooltip de um ano, na mesma ordem e com os mesmos rótulos do resumo. */
export function montarLinhasTooltip(ponto: PontoComparacaoMunicipioModel): string[] {
  const r = TEXTOS_COMPARACAO.resumo;
  const linhas = [
    `<b>${r.ano} ${ponto.ano}</b>`,
    `${r.indiceEscola}: ${formatarPercentual(ponto.indice_escola_percentual)}`,
    `${r.mediaMunicipal}: ${formatarPercentual(ponto.media_municipal_percentual)}`,
    `${r.diferenca}: ${formatarPontosPercentuais(ponto.diferenca_pontos_percentuais)}`,
    `${r.pares}: ${formatarParcial(ponto.quantidade_pares_validos, ponto.denominador_pares)}`,
    `${r.indicadores}: ${formatarParcial(ponto.quantidade_indicadores_validos, ponto.total_indicadores)}`,
  ];
  const aviso = TEXTOS_COMPARACAO.situacao[ponto.situacao];
  return aviso ? [...linhas, `<i>${aviso}</i>`] : linhas;
}

/**
 * Figura Plotly Escola × Média municipal: duas linhas identificadas, eixo de 0% a 100%,
 * anos crescentes e `connectgaps: false` para não ligar valores separados por lacunas.
 */
export function montarFiguraComparacao(serie: SerieGraficoComparacaoModel): PlotlyFigure {
  const tooltips = serie.pontos.map((ponto) => montarLinhasTooltip(ponto).join('<br>'));

  const linha = (nome: string, y: (number | null)[], cor: string, tracejada: boolean) => ({
    type: 'scatter',
    mode: 'lines+markers',
    name: nome,
    x: serie.anos,
    y,
    connectgaps: false,
    line: { color: cor, width: 3, dash: tracejada ? 'dash' : 'solid' },
    marker: { color: cor, size: 9 },
    customdata: tooltips,
    hovertemplate: '%{customdata}<extra></extra>',
  });

  return {
    data: [
      linha(TEXTOS_COMPARACAO.serieEscola, serie.escola, CORES.escola, false),
      linha(TEXTOS_COMPARACAO.serieMunicipio, serie.mediaMunicipal, CORES.municipio, true),
    ],
    layout: {
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        family: "Inter, 'Segoe UI', Roboto, Arial, sans-serif",
        color: CORES.texto,
        size: 12,
      },
      margin: { l: 56, r: 18, t: 16, b: 64, pad: 0 },
      hovermode: 'closest',
      hoverlabel: { bgcolor: '#ffffff', bordercolor: '#cfdbea', font: { color: CORES.texto } },
      legend: { orientation: 'h', x: 0, y: 1.12, xanchor: 'left' },
      xaxis: {
        title: { text: TEXTOS_COMPARACAO.eixoX },
        tickmode: 'array',
        tickvals: serie.anos,
        ticktext: serie.anos.map(String),
        range: serie.anos.length
          ? [serie.anos[0] - 0.3, serie.anos[serie.anos.length - 1] + 0.3]
          : undefined,
        showgrid: false,
        zeroline: false,
      },
      yaxis: {
        title: { text: TEXTOS_COMPARACAO.eixoY },
        range: [0, 100],
        fixedrange: true,
        ticksuffix: '%',
        dtick: 20,
        gridcolor: CORES.grade,
        zeroline: false,
      },
    },
  };
}

export interface ItemResumoComparacaoModel {
  titulo: string;
  valor: string;
  descricao?: string;
}

/** Cartões do resumo, sempre a partir do último ano da série. */
export function montarResumoComparacao(
  serie: SerieGraficoComparacaoModel,
): ItemResumoComparacaoModel[] {
  const ponto = serie.pontos.at(-1);
  if (!ponto) return [];

  const r = TEXTOS_COMPARACAO.resumo;
  const aviso = TEXTOS_COMPARACAO.situacao[ponto.situacao] || undefined;

  return [
    { titulo: r.ano, valor: String(ponto.ano), descricao: aviso },
    {
      titulo: r.indiceEscola,
      valor: formatarPercentual(ponto.indice_escola_percentual),
    },
    {
      titulo: r.mediaMunicipal,
      valor: formatarPercentual(ponto.media_municipal_percentual),
    },
    {
      titulo: r.diferenca,
      valor: formatarPontosPercentuais(ponto.diferenca_pontos_percentuais),
      descricao: 'Índice da escola menos a média municipal.',
    },
    {
      titulo: r.pares,
      valor: formatarParcial(ponto.quantidade_pares_validos, ponto.denominador_pares),
      descricao: 'Outras escolas do município usadas na média.',
    },
    {
      titulo: r.indicadores,
      valor: formatarParcial(ponto.quantidade_indicadores_validos, ponto.total_indicadores),
      descricao: 'Indicadores com informação no Censo Escolar.',
    },
  ];
}

export type ClassificacaoSerieComparacao = 'completa' | 'sem_historico' | 'sem_pares';

/**
 * `sem_historico`: a escola não tem índice em nenhum ano.
 * `sem_pares`: há índice da escola, mas nenhum ano tem média municipal.
 */
export function classificarSerieComparacao(
  serie: SerieGraficoComparacaoModel,
): ClassificacaoSerieComparacao {
  if (serie.escola.every((valor) => valor === null)) return 'sem_historico';
  if (serie.mediaMunicipal.every((valor) => valor === null)) return 'sem_pares';
  return 'completa';
}
