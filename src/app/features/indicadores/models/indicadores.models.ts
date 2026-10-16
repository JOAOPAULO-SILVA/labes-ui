import type { PlotlyFigure } from '../../../core/api/models/plotly-figure';
import type { Observable } from 'rxjs';

export interface MetricaFiltroModel {
  chave: string;
  label: string;
}

export interface MunicipioFiltroModel {
  codigo: number;
  nome: string;
}

export interface DadosFiltrosModel {
  anos: number[];
  metricas: MetricaFiltroModel[];
  municipios: MunicipioFiltroModel[];
  rede_ensino?: string[];
  tp_localizacao?: string[];
}

export interface GraficoModel {
  plotly: PlotlyFigure;
  tipo: string;
  titulo: string;
  [key: string]: unknown;
}

export interface GraficoListaModel extends GraficoModel {
  chave: string;
}

export type GraficoApresentacao = {
  chave: string;
  titulo: string;
  tipo: string;
  plotly: PlotlyFigure;
};

export interface MapaPontoBaseModel {
  co_entidade: number;
  nome: string;
  municipio?: string | null;
  latitude: number;
  longitude: number;
  score: number;
  classificacao: string;
  [key: string]: unknown;
}

export interface GeoJsonGeometryModel {
  type: string;
  coordinates: unknown;
}

export interface GeoJsonFeatureModel {
  type: 'Feature';
  geometry: GeoJsonGeometryModel;
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollectionModel {
  type: 'FeatureCollection';
  features: GeoJsonFeatureModel[];
}

export interface LegendaItemModel {
  label: string;
  range: string;
  classe: string;
}

export interface FiltrosAnaliseTemporalModel {
  metrica: string | null;
  pibid: boolean | null;
}

/**
 * Contrato comum das facades de acessibilidade, conectividade e infraestrutura
 * usado pelo panorama da análise temporal.
 */
export interface FonteAnaliseTemporal {
  listarFiltros(): Observable<{ metricas: MetricaFiltroModel[] }>;
  listarAnaliseTemporal(params: FiltrosAnaliseTemporalModel): Observable<{
    listaGraficos: GraficoListaModel[];
  }>;
}
