import { AppRangeValue } from '../../../../../shared/ui/range-slider/app-range-slider.types';
import { EscolaBuscaModel, RedeEnsinoModel } from '../../../models/infraestrutura.models';

/** Filtros da aba "Análise por Escola" (REQ07 §2.2). `null` = valor padrão ("Todas/Todos"). */
export interface FiltrosEscolaModel {
  escola: number | null;
  /** Dependência administrativa da escola: restringe a lista de escolas. */
  dependenciaEscola: string | null;
  /** Município: restringe a lista de escolas. */
  municipio: string | null;
  /** Dependência administrativa do município: rede das escolas de referência (BE13). */
  redeMunicipio: RedeEnsinoModel | null;
  /** Intervalo de anos; `null` = todos os anos disponíveis (padrão da REQ07). */
  anos: AppRangeValue | null;
}

export const FILTROS_ESCOLA_PADRAO: FiltrosEscolaModel = {
  escola: null,
  dependenciaEscola: null,
  municipio: null,
  redeMunicipio: null,
  anos: null,
};

/** Período da metodologia, usado se `/filtros` não informar os anos. */
export const ANOS_PADRAO: readonly number[] = [2022, 2023, 2024, 2025];

/** Mínimo de anos inclusivos no intervalo (REQ07 §1.1). */
export const MINIMO_ANOS = 2;

/** Anos do catálogo, ordenados e sem repetição; vazio cai no período padrão. */
export function anosDisponiveisDoCatalogo(
  anos: readonly number[] | null | undefined,
  padrao: readonly number[],
): number[] {
  const validos = [...new Set((anos ?? []).map(Number).filter(Number.isInteger))].sort(
    (a, b) => a - b,
  );
  return validos.length > 0 ? validos : [...padrao];
}

/** Primeiro e último ano disponíveis. */
export function intervaloAnos(anos: readonly number[]): AppRangeValue {
  const lista = anos.length > 0 ? anos : ANOS_PADRAO;
  return [lista[0], lista[lista.length - 1]];
}

/**
 * Uma escola que deixou de passar nos filtros de município ou dependência é desmarcada,
 * como pede a REQ07 ("restaurar os filtros aos seus estados padrões").
 */
export function normalizarFiltrosEscola(
  filtros: FiltrosEscolaModel,
  escolas: readonly EscolaBuscaModel[],
): FiltrosEscolaModel {
  if (filtros.escola === null) return filtros;
  const escola = escolas.find((e) => e.co_entidade === filtros.escola);
  const passa =
    !!escola &&
    (!filtros.municipio || escola.municipio === filtros.municipio) &&
    (!filtros.dependenciaEscola || escola.dependencia === filtros.dependenciaEscola);
  return passa ? filtros : { ...filtros, escola: null };
}

/**
 * Resumo do cartão recolhido no celular (REQ07 §2.2), ex.:
 * "Selecione uma escola · Todos os municípios 2022–2025 · Todas as dependências administrativas".
 */
export function resumoFiltrosEscola(
  filtros: FiltrosEscolaModel,
  nomeEscola: string | null,
  limites: AppRangeValue,
): string {
  const [inicio, fim] = filtros.anos ?? limites;
  const dependencia =
    filtros.dependenciaEscola ?? filtros.redeMunicipio ?? 'Todas as dependências administrativas';
  return `${nomeEscola ?? 'Selecione uma escola'} · ${filtros.municipio ?? 'Todos os municípios'} ${inicio}–${fim} · ${dependencia}`;
}
