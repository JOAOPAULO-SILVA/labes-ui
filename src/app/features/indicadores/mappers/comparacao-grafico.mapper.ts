import { PlotlyFigure } from '../../../core/api/models/plotly-figure';
import {
  ItemComposicaoIndiceModel,
  ItemComposicaoTerritorialModel,
  PontoComparacaoMunicipioModel,
  SerieGraficoComparacaoModel,
} from '../models/infraestrutura.models';

/**
 * Textos do gráfico, do tooltip, do resumo e dos estados.
 * Fontes, em ordem de precedência: REQ-04 SP3-11 (definição de textos, legenda, tooltip e
 * limitações), protótipo "v1 escolas x municipios" (Figma) e contrato BE-05 v2.
 */
export const TEXTOS_COMPARACAO = {
  titulo: 'Infraestrutura • Análise Temporal',
  subtitulo:
    'Compare o desempenho da escola selecionada com a média das demais escolas do mesmo município ao longo do tempo.',
  tituloGrafico: 'Percentual de recursos de infraestrutura disponíveis — evolução temporal',
  dicaGrafico:
    'Passe o cursor sobre os pontos da linha do gráfico para visualizar o resumo detalhado daquele ano.',
  serieEscola: 'Escola selecionada',
  serieMunicipio: 'Média das demais escolas do município',
  eixoY: 'Percentual de recursos',
  eixoX: 'Ano',
  semDado: 'Sem dados',
  resumoDoAno: (ano: number) =>
    `Os cartões abaixo indicam um resumo de ${ano} (Último ano disponível).`,
  resumo: {
    escola: 'Escola selecionada',
    municipio: 'Demais escolas do município',
    diferenca: 'Diferença',
    indicadores: 'Indicadores válidos',
  },
  tooltip: {
    escola: 'Escola selecionada',
    municipio: 'Demais escolas do município',
    diferenca: 'Diferença',
  },
  regras: [
    'Sim = 1 | Não = 0 | Sem informação = excluída do cálculo.',
    'A referência municipal exclui a escola selecionada.',
    'Todos os indicadores possuem o mesmo peso.',
    'O índice representa disponibilidade de infraestrutura, não qualidade escolar.',
    'Esta análise utiliza uma metodologia de cálculo em caráter provisório e pendente de homologação.',
  ],
  inicial: 'Selecione uma escola para visualizar a evolução temporal.',
  composicao: {
    titulo: 'Composição do índice',
    ano: 'Ano',
    carregando: 'Carregando a composição do índice…',
    inicial: 'Selecione uma escola para visualizar a composição do índice.',
    erro: 'Não foi possível carregar a composição do índice.',
    semRegistro: (ano: number) => `A escola não possui registro no Censo Escolar de ${ano}.`,
    resumo: (presentes: number, validos: number, total: number) =>
      `${presentes} de ${validos} indicadores válidos presentes (${total} no total).`,
  },
  territorial: {
    titulo: 'Composição das demais escolas do município',
    referencia: (municipio: string, ano: number) => `${municipio} · ${ano}`,
    escolasReferencia: (n: number) =>
      n === 1
        ? '1 escola de referência (exclui a selecionada)'
        : `${n} escolas de referência (exclui a selecionada)`,
    carregando: 'Carregando a composição territorial…',
    inicial: 'Selecione uma escola para visualizar a composição das demais escolas do município.',
    erro: 'Não foi possível carregar a composição territorial.',
    semRegistro: (ano: number) =>
      `Sem referência territorial em ${ano}: a escola não possui registro no Censo Escolar desse ano.`,
    semPares: (ano: number) =>
      `Não há outras escolas do município com registro em ${ano} para compor a referência.`,
    legenda: {
      presentes: 'Escolas com o recurso',
      validos: 'escolas com informação válida',
      percentual: '% de presença entre as válidas',
      semDados: 'Escolas sem informação (fora do cálculo)',
    },
    contagem: (presentes: number, validos: number) => `${presentes} de ${validos}`,
    semDados: (n: number) => `${n} sem dados`,
    tooltip: (
      label: string,
      presentes: number,
      validos: number,
      semDados: number,
      pct: string,
      cobertura: string,
    ) =>
      `${label}: ${presentes} de ${validos} escolas com informação válida possuem o recurso (${pct}). ${semDados} sem informação; cobertura do indicador: ${cobertura}.`,
    nota: 'A presença por indicador não equivale à média municipal do índice, que é calculada escola a escola.',
    avisoCobertura: (ano: number) =>
      `Cobertura baixa: menos de 60% dos indicadores da escola selecionada têm informação válida em ${ano}. Os dados continuam exibidos e devem ser interpretados com cautela.`,
    avisoCoberturaNota:
      'O limite de 60% é informativo e provisório; ele não bloqueia a análise e a metodologia ainda não foi homologada.',
  },
  valoresIndicador: { sim: 'Sim', nao: 'Não', sem_dados: 'Sem dados' },
  semHistorico:
    'Não existem dados de infraestrutura suficientes para desenhar a evolução temporal desta escola.',
} as const;

/** Os 17 indicadores da metodologia infraestrutura-v2-provisoria (contrato BE-05 v2). */
export const INDICADORES_METODOLOGIA = [
  'in_agua_potavel',
  'in_energia_rede_publica',
  'in_esgoto_rede_publica',
  'in_lixo_servico_coleta',
  'in_banheiro',
  'in_banheiro_pne',
  'in_biblioteca',
  'in_sala_leitura',
  'in_laboratorio_ciencias',
  'in_laboratorio_informatica',
  'in_sala_multiuso',
  'in_sala_atendimento_especial',
  'in_cozinha',
  'in_refeitorio',
  'in_quadra_esportes',
  'in_patio_coberto',
  'in_auditorio',
] as const;

/** Nomes dos indicadores na composição do índice (protótipo e catálogo de métricas). */
export const LABELS_INDICADORES: Readonly<Record<string, string>> = {
  in_agua_potavel: 'Água potável',
  in_energia_rede_publica: 'Energia (rede pública)',
  in_esgoto_rede_publica: 'Esgoto (rede pública)',
  in_lixo_servico_coleta: 'Coleta de lixo',
  in_banheiro: 'Banheiro',
  in_banheiro_pne: 'Banheiro acessível (PNE)',
  in_biblioteca: 'Biblioteca',
  in_sala_leitura: 'Sala de leitura',
  in_laboratorio_ciencias: 'Laboratório de ciências',
  in_laboratorio_informatica: 'Laboratório de informática',
  in_sala_multiuso: 'Sala multiuso',
  in_sala_atendimento_especial: 'Sala de atendimento especial',
  in_cozinha: 'Cozinha',
  in_refeitorio: 'Refeitório',
  in_quadra_esportes: 'Quadra de esportes',
  in_patio_coberto: 'Pátio coberto',
  in_auditorio: 'Auditório',
};

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
  return `${formatoNumero.format(valor)} p.p.`;
}

/**
 * Linhas do tooltip de um ano (REQ-04 SP3-11, item 3): formato padrão e as duas exceções.
 * Valor ausente = "Sem dados", sem a contagem entre parênteses.
 */
export function montarLinhasTooltip(ponto: PontoComparacaoMunicipioModel): string[] {
  const t = TEXTOS_COMPARACAO.tooltip;
  const escola =
    ponto.indice_escola_percentual === null
      ? TEXTOS_COMPARACAO.semDado
      : `${formatarPercentual(ponto.indice_escola_percentual)} (${ponto.quantidade_indicadores_validos} indicadores válidos)`;
  const municipio =
    ponto.media_municipal_percentual === null
      ? TEXTOS_COMPARACAO.semDado
      : `${formatarPercentual(ponto.media_municipal_percentual)} (${ponto.quantidade_pares_validos} pares)`;
  return [
    `<b>${ponto.ano}</b>`,
    `${t.escola}: ${escola}`,
    `${t.municipio}: ${municipio}`,
    `${t.diferenca}: ${formatarPontosPercentuais(ponto.diferenca_pontos_percentuais)}`,
  ];
}

/**
 * Figura Plotly Escola × Média municipal: duas linhas identificadas, eixo de 0% a 100%,
 * anos crescentes, rótulos nos pontos e `connectgaps: false` para não ligar lacunas.
 */
export function montarFiguraComparacao(serie: SerieGraficoComparacaoModel): PlotlyFigure {
  const tooltips = serie.pontos.map((ponto) => montarLinhasTooltip(ponto).join('<br>'));
  const rotulos = (valores: (number | null)[]) =>
    valores.map((v) => (v === null ? '' : formatarPercentual(v)));

  const linha = (
    nome: string,
    y: (number | null)[],
    cor: string,
    posicaoRotulo: 'top center' | 'bottom center',
  ) => ({
    type: 'scatter',
    mode: 'lines+markers+text',
    name: nome,
    x: serie.anos,
    y,
    text: rotulos(y),
    textposition: posicaoRotulo,
    textfont: { color: cor, size: 11 },
    connectgaps: false,
    line: { color: cor, width: 3 },
    marker: { color: cor, size: 9 },
    customdata: tooltips,
    hovertemplate: '%{customdata}<extra></extra>',
  });

  return {
    data: [
      linha(TEXTOS_COMPARACAO.serieEscola, serie.escola, CORES.escola, 'bottom center'),
      linha(TEXTOS_COMPARACAO.serieMunicipio, serie.mediaMunicipal, CORES.municipio, 'top center'),
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
      margin: { l: 56, r: 18, t: 16, b: 96, pad: 0 },
      hovermode: 'closest',
      hoverlabel: { bgcolor: '#ffffff', bordercolor: '#cfdbea', font: { color: CORES.texto } },
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.28 },
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

/** Último ano em que a escola tem índice; sem nenhum, o último ano da série. */
export function selecionarPontoResumo(
  serie: SerieGraficoComparacaoModel,
): PontoComparacaoMunicipioModel | null {
  const comDados = serie.pontos.filter((p) => p.indice_escola_percentual !== null);
  return comDados.at(-1) ?? serie.pontos.at(-1) ?? null;
}

export interface ItemResumoComparacaoModel {
  titulo: string;
  valor: string;
  descricao?: string;
  icone: string;
  /** Valor exibido como selo, como a diferença no protótipo. */
  selo?: boolean;
}

const ICONES_RESUMO = {
  escola: 'pi-building',
  municipio: 'pi-users',
  diferenca: 'pi-chart-line',
  indicadores: 'pi-file',
};

/** Cartões sem dados: estado inicial, carregamento, erro e dados insuficientes. */
export function montarResumoVazio(): ItemResumoComparacaoModel[] {
  const r = TEXTOS_COMPARACAO.resumo;
  const semDado = TEXTOS_COMPARACAO.semDado;
  return [
    { titulo: r.escola, valor: semDado, icone: ICONES_RESUMO.escola },
    { titulo: r.municipio, valor: semDado, icone: ICONES_RESUMO.municipio },
    { titulo: r.diferenca, valor: semDado, icone: ICONES_RESUMO.diferenca, selo: true },
    { titulo: r.indicadores, valor: semDado, icone: ICONES_RESUMO.indicadores },
  ];
}

/** Os quatro cartões do protótipo, a partir do último ano disponível. */
export function montarResumoComparacao(
  serie: SerieGraficoComparacaoModel,
): ItemResumoComparacaoModel[] {
  const ponto = selecionarPontoResumo(serie);
  if (!ponto) return [];

  const r = TEXTOS_COMPARACAO.resumo;
  const anosComDados = serie.pontos.filter((p) => p.indice_escola_percentual !== null);
  const mesmoConjunto =
    new Set(anosComDados.map((p) => p.quantidade_indicadores_validos)).size <= 1;

  return [
    {
      titulo: r.escola,
      valor: formatarPercentual(ponto.indice_escola_percentual),
      descricao: `${ponto.quantidade_indicadores_presentes} de ${ponto.total_indicadores} recursos disponíveis`,
      icone: ICONES_RESUMO.escola,
    },
    {
      titulo: r.municipio,
      valor: formatarPercentual(ponto.media_municipal_percentual),
      descricao: `${ponto.quantidade_pares_validos} escolas na referência`,
      icone: ICONES_RESUMO.municipio,
    },
    {
      titulo: r.diferenca,
      valor: formatarPontosPercentuais(ponto.diferenca_pontos_percentuais),
      icone: ICONES_RESUMO.diferenca,
      selo: true,
    },
    {
      titulo: r.indicadores,
      valor: String(ponto.quantidade_indicadores_validos),
      descricao: mesmoConjunto ? 'mesmo conjunto em todos os anos' : 'varia entre os anos',
      icone: ICONES_RESUMO.indicadores,
    },
  ];
}

/**
 * Composição do índice no ano escolhido, na ordem da metodologia.
 * Indicador ausente ou nulo na resposta aparece como "Sem dados" (nunca como "Não").
 */
export function montarComposicaoIndice(
  ponto: PontoComparacaoMunicipioModel | null,
  chaves: readonly string[],
  labels: Readonly<Record<string, string>> = LABELS_INDICADORES,
): ItemComposicaoIndiceModel[] {
  return chaves.map((chave) => {
    const valor = ponto?.composicao_escola[chave];
    return {
      chave,
      label: labels[chave] ?? chave,
      valor: valor === 1 ? 'sim' : valor === 0 ? 'nao' : 'sem_dados',
    };
  });
}

/**
 * Contagens das demais escolas do município no ano, na mesma ordem e com os mesmos
 * rótulos da composição da escola. Sem composição municipal, devolve lista vazia.
 */
export function montarComposicaoTerritorial(
  ponto: PontoComparacaoMunicipioModel | null,
  chaves: readonly string[],
  labels: Readonly<Record<string, string>> = LABELS_INDICADORES,
): ItemComposicaoTerritorialModel[] {
  const composicao = ponto?.composicao_municipal;
  if (!composicao) return [];
  return chaves.map((chave) => {
    const item = composicao[chave];
    return {
      chave,
      label: labels[chave] ?? chave,
      presentes: item?.quantidade_presentes ?? 0,
      validos: item?.quantidade_validos ?? 0,
      semDados: item?.quantidade_sem_dados ?? 0,
      referencia: item?.quantidade_escolas_referencia ?? 0,
      percentual: item?.percentual_presentes ?? null,
      cobertura: item?.cobertura_percentual ?? null,
    };
  });
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
