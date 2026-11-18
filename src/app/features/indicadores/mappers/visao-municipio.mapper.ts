import { PlotlyFigure } from '../../../core/api/models/plotly-figure';
import { AppRangeValue } from '../../../shared/ui/range-slider/app-range-slider.types';
import { PontoMunicipioModel, RedeEnsinoModel } from '../models/infraestrutura.models';
import {
  CORES,
  INDICADORES_METODOLOGIA,
  ItemResumoComparacaoModel,
  TEXTOS_COMPARACAO,
  formatarPercentual,
  montarLayoutTemporal,
  montarLinhaTemporal,
} from './comparacao-grafico.mapper';

/** Textos da aba "Análise por Município" (REQ07 Frente 2, FE16; contrato BE15). */
export const TEXTOS_MUNICIPIO = {
  titulo: TEXTOS_COMPARACAO.titulo,
  subtitulo: 'Acompanhe a evolução da cobertura de infraestrutura da rede municipal.',
  tituloGrafico: 'Evolução da cobertura da rede municipal',
  serie: 'Cobertura média da rede municipal',
  eixoY: 'Cobertura da rede',
  tooltip: { ano: 'Ano', cobertura: 'Cobertura do município selecionado' },
  semDado: TEXTOS_COMPARACAO.semDado,
  naoCalculada: 'Não calculada',
  inicial: 'Selecione um município para visualizar a evolução temporal.',
  semDados: TEXTOS_COMPARACAO.semHistorico,
  denominadorZero: 'Não existem escolas registradas por meio do filtro aplicado.',
  resumoDoAno: TEXTOS_COMPARACAO.resumoDoAno,
  resumo: {
    elegiveis: 'Escolas elegíveis',
    comInformacao: 'Escolas com informação',
    cobertura: 'Cobertura da rede',
    indicadores: 'Indicadores selecionados',
    rede: (municipio: string) => `Rede de ${municipio}`,
    semDadosEscolas: (n: number) => `${n} ${n === 1 ? 'escola' : 'escolas'} sem dados`,
    mediaIndices: 'Média dos índices escolares',
    mesmoConjunto: 'mesmo conjunto em todos os anos',
  },
  anos: {
    titulo: 'Escolas elegíveis e cobertura por ano',
    coberturaRede: 'Cobertura da rede',
    coberturaIndisponivel: 'Cobertura indisponível',
    elegiveis: (n: number) => `${n} ${n === 1 ? 'escola elegível' : 'escolas elegíveis'}`,
    comInformacao: (n: number) => `${n} com informação válida`,
    semDados: (n: number) => `${n} sem dados`,
    denominadorZero: 'Denominador zero',
    informacaoIndisponivel: 'Informação de cobertura indisponível',
    semDadosPercentual: 'Sem dados para calcular o percentual',
    selecione: 'Selecione um município',
  },
  comoInterpretar: {
    titulo: 'Como interpretar',
    texto:
      'Não há escolas elegíveis no período selecionado. Denominador zero não representa cobertura de 0%, mas somente que não existe nenhuma escola com base no filtro aplicado para ser avaliada.',
    textoSemDados:
      'Sem dados não equivale a zero. Não há informações suficientes para calcular a cobertura de infraestrutura neste período.',
  },
  filtros: {
    municipio: 'Município',
    municipioPlaceholder: 'Selecione um município',
    rede: 'Dependência administrativa do município',
    anos: 'Intervalo de anos',
    anosDica: 'Selecionar no mínimo 2 anos',
    indicadores: 'Indicadores de infraestrutura',
    indicadoresDica:
      'Todos os indicadores selecionados por padrão. Selecionar no mínimo 1 indicador.',
    indicadoresResumo: (n: number, total: number) => `${n} de ${total} selecionados`,
  },
  /** REQ07 §3: regras da aba Município. */
  regras: [
    'Sim = 1 | Não = 0 | Sem informação = excluída do cálculo.',
    'A cobertura municipal é a média dos índices das escolas elegíveis com informação válida.',
    'Todos os indicadores possuem o mesmo peso.',
    'Esta análise utiliza metodologia de cálculo em caráter provisório e pendente de homologação.',
    'O índice representa disponibilidade de infraestrutura, não qualidade escolar.',
  ],
} as const;

export const TOTAL_INDICADORES = INDICADORES_METODOLOGIA.length;

/** Filtros da aba Município; `anos` nulo = todos os anos disponíveis. */
export interface FiltrosMunicipioModel {
  municipio: number | null;
  rede: RedeEnsinoModel | null;
  anos: AppRangeValue | null;
  indicadores: readonly string[];
}

export const FILTROS_MUNICIPIO_PADRAO: FiltrosMunicipioModel = {
  municipio: null,
  rede: null,
  anos: null,
  indicadores: INDICADORES_METODOLOGIA,
};

/** Resumo do cartão recolhido no celular (REQ07 §3.2). */
export function resumoFiltrosMunicipio(
  filtros: FiltrosMunicipioModel,
  nomeMunicipio: string | null,
  limites: AppRangeValue,
): string {
  const [inicio, fim] = filtros.anos ?? limites;
  return [
    nomeMunicipio ?? 'Todos os municípios',
    `${filtros.rede ?? 'Todas as dependências administrativas'} ${inicio}–${fim}`,
    `${filtros.indicadores.length} de ${TOTAL_INDICADORES} indicadores`,
  ].join(' · ');
}

/**
 * Um ponto por ano do intervalo, em ordem. Ano que a API não devolveu é tratado como
 * "Sem dados" (nunca como zero nem com o valor do ano anterior).
 */
export function prepararSerieMunicipio(
  serie: readonly PontoMunicipioModel[],
  [inicio, fim]: AppRangeValue,
): PontoMunicipioModel[] {
  const porAno = new Map(serie.map((p) => [p.ano, p]));
  const pontos: PontoMunicipioModel[] = [];
  for (let ano = inicio; ano <= fim; ano++) {
    pontos.push(
      porAno.get(ano) ?? {
        ano,
        situacao: 'sem_dados',
        cobertura_media_percentual: null,
        quantidade_escolas: 0,
        quantidade_escolas_com_informacao: 0,
        quantidade_escolas_sem_dados: 0,
        indicadores: {},
      },
    );
  }
  return pontos;
}

/**
 * `com_dados`: ao menos um ano tem cobertura (o gráfico é desenhado, com lacunas se for o
 * caso). `denominador_zero`: nenhum ano tem escola elegível. `sem_dados`: o restante.
 */
export type ClassificacaoSerieMunicipio = 'com_dados' | 'sem_dados' | 'denominador_zero';

export function classificarSerieMunicipio(
  pontos: readonly PontoMunicipioModel[],
): ClassificacaoSerieMunicipio {
  if (pontos.some((p) => p.cobertura_media_percentual !== null)) return 'com_dados';
  if (pontos.length > 0 && pontos.every((p) => p.situacao === 'denominador_zero')) {
    return 'denominador_zero';
  }
  return 'sem_dados';
}

function valorCobertura(ponto: PontoMunicipioModel): string {
  if (ponto.cobertura_media_percentual !== null) {
    return formatarPercentual(ponto.cobertura_media_percentual);
  }
  return ponto.situacao === 'denominador_zero'
    ? TEXTOS_MUNICIPIO.naoCalculada
    : TEXTOS_MUNICIPIO.semDado;
}

export function montarLinhasTooltipMunicipio(ponto: PontoMunicipioModel): string[] {
  const t = TEXTOS_MUNICIPIO.tooltip;
  return [`<b>${t.ano}: ${ponto.ano}</b>`, `${t.cobertura}: ${valorCobertura(ponto)}`];
}

/** Uma linha azul, "Cobertura média da rede municipal", com lacunas sem ligação. */
export function montarFiguraMunicipio(pontos: readonly PontoMunicipioModel[]): PlotlyFigure {
  const anos = pontos.map((p) => p.ano);
  return {
    data: [
      montarLinhaTemporal(
        TEXTOS_MUNICIPIO.serie,
        anos,
        pontos.map((p) => p.cobertura_media_percentual),
        CORES.escola,
        pontos.map((p) => montarLinhasTooltipMunicipio(p).join('<br>')),
      ),
    ],
    layout: montarLayoutTemporal(anos, TEXTOS_MUNICIPIO.eixoY),
  };
}

const ICONES = {
  elegiveis: 'pi-building',
  comInformacao: 'pi-check-circle',
  cobertura: 'pi-chart-line',
  indicadores: 'pi-file',
};

/**
 * Os quatro cartões (REQ07 §3.3), do último ano do intervalo. Sem ponto (estado inicial,
 * carregamento ou erro) ou sem dados, os três primeiros mostram "Sem dados". Denominador
 * zero mostra "0" escolas e cobertura "Não calculada", nunca 0%.
 */
export function montarResumoMunicipio(
  ponto: PontoMunicipioModel | null,
  nomeMunicipio: string | null,
  quantidadeIndicadores: number,
): ItemResumoComparacaoModel[] {
  const r = TEXTOS_MUNICIPIO.resumo;
  const semDado = TEXTOS_MUNICIPIO.semDado;
  const indicadores: ItemResumoComparacaoModel = {
    titulo: r.indicadores,
    valor: String(quantidadeIndicadores),
    descricao: r.mesmoConjunto,
    icone: ICONES.indicadores,
  };
  const rede = nomeMunicipio ? r.rede(nomeMunicipio) : undefined;

  if (ponto?.situacao === 'denominador_zero') {
    return [
      { titulo: r.elegiveis, valor: '0', descricao: rede, icone: ICONES.elegiveis },
      { titulo: r.comInformacao, valor: '0', icone: ICONES.comInformacao },
      { titulo: r.cobertura, valor: TEXTOS_MUNICIPIO.naoCalculada, icone: ICONES.cobertura },
      indicadores,
    ];
  }
  if (!ponto || ponto.cobertura_media_percentual === null) {
    return [
      { titulo: r.elegiveis, valor: semDado, icone: ICONES.elegiveis },
      { titulo: r.comInformacao, valor: semDado, icone: ICONES.comInformacao },
      { titulo: r.cobertura, valor: semDado, icone: ICONES.cobertura },
      indicadores,
    ];
  }
  return [
    {
      titulo: r.elegiveis,
      valor: String(ponto.quantidade_escolas),
      descricao: rede,
      icone: ICONES.elegiveis,
    },
    {
      titulo: r.comInformacao,
      valor: String(ponto.quantidade_escolas_com_informacao),
      descricao: r.semDadosEscolas(ponto.quantidade_escolas_sem_dados),
      icone: ICONES.comInformacao,
    },
    {
      titulo: r.cobertura,
      valor: formatarPercentual(ponto.cobertura_media_percentual),
      descricao: r.mediaIndices,
      icone: ICONES.cobertura,
    },
    indicadores,
  ];
}

export type VarianteCartaoAno = 'com_dados' | 'sem_dados' | 'denominador_zero' | 'inicial';

/** Cartão de um ano em "Escolas elegíveis e cobertura por ano" (REQ07 §3.6). */
export interface CartaoAnoMunicipioModel {
  ano: number;
  valor: string;
  rotulo: string | null;
  linhas: string[];
  variante: VarianteCartaoAno;
}

export function montarCartaoAno(ponto: PontoMunicipioModel): CartaoAnoMunicipioModel {
  const t = TEXTOS_MUNICIPIO.anos;
  if (ponto.situacao === 'denominador_zero') {
    return {
      ano: ponto.ano,
      valor: TEXTOS_MUNICIPIO.naoCalculada,
      rotulo: t.coberturaRede,
      linhas: [t.elegiveis(0), t.comInformacao(0), t.denominadorZero],
      variante: 'denominador_zero',
    };
  }
  if (ponto.cobertura_media_percentual === null) {
    return {
      ano: ponto.ano,
      valor: TEXTOS_MUNICIPIO.semDado,
      rotulo: t.coberturaIndisponivel,
      linhas: [t.informacaoIndisponivel, t.semDadosPercentual],
      variante: 'sem_dados',
    };
  }
  return {
    ano: ponto.ano,
    valor: formatarPercentual(ponto.cobertura_media_percentual),
    rotulo: t.coberturaRede,
    linhas: [
      t.elegiveis(ponto.quantidade_escolas),
      t.comInformacao(ponto.quantidade_escolas_com_informacao),
      t.semDados(ponto.quantidade_escolas_sem_dados),
    ],
    variante: 'com_dados',
  };
}

/** Tela padrão (sem município, carregando ou erro): cada ano com "Sem dados". */
export function montarCartoesAnoVazios(
  [inicio, fim]: AppRangeValue,
  linha: string | null = TEXTOS_MUNICIPIO.anos.selecione,
): CartaoAnoMunicipioModel[] {
  const cartoes: CartaoAnoMunicipioModel[] = [];
  for (let ano = inicio; ano <= fim; ano++) {
    cartoes.push({
      ano,
      valor: TEXTOS_MUNICIPIO.semDado,
      rotulo: null,
      linhas: linha ? [linha] : [],
      variante: 'inicial',
    });
  }
  return cartoes;
}
