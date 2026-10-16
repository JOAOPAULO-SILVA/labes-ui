import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, from, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { InfraestruturaService } from '../../../core/api/services/infraestrutura.service';
import { FiltrosService } from '../../../core/api/services/filtros.service';
import type {
  GetAnaliseTemporalInfraestruturaInfraestruturaAnaliseTemporalGet$Params,
  GetPainelEscolasInfraestruturaInfraestruturaPainelEscolasGet$Params,
  GetPainelInfraestruturaInfraestruturaPainelGet$Params,
} from '../../../core/api';
import {
  AnaliseTemporalModel,
  ComparacaoEscolaMunicipioModel,
  DadosFiltrosModel,
  EscolaGeoEntryModel,
  GeoJsonFeatureCollectionModel,
  MapaInfraestruturaModel,
  MapaMunicipioGeoJsonCollectionModel,
  MapaMunicipioResumoModel,
  MapaPontoModel,
  PainelEscolasModel,
  PainelInfraestruturaModel,
} from '../models/infraestrutura.models';
import {
  mapAnaliseTemporalResponseToModel,
  mapComparacaoEscolaMunicipioErro,
  mapComparacaoEscolaMunicipioResponseToModel,
  mapFiltrosResponseToModel,
  mapGeoJsonMunicipiosComInfraestrutura,
  mapMapaMunicipioResumoFromPontos,
  mapMapaResponseToModel,
  mapPainelEscolasResponseToModel,
  mapPainelResponseToModel,
} from '../mappers/infraestrutura.mapper';

type MapaMunicipalComPontosModel = {
  collection: MapaMunicipioGeoJsonCollectionModel;
  pontos: MapaPontoModel[];
};

@Injectable({ providedIn: 'root' })
export class InfraestruturaFacade {
  private readonly api = inject(InfraestruturaService);
  private readonly filtrosApi = inject(FiltrosService);
  private readonly http = inject(HttpClient);

  private escolasGeoMap$: Promise<Map<number, EscolaGeoEntryModel>> | null = null;

  private getEscolasGeoMap(): Promise<Map<number, EscolaGeoEntryModel>> {
    if (!this.escolasGeoMap$) {
      this.escolasGeoMap$ = firstValueFrom(
        this.http.get<GeoJsonFeatureCollectionModel>('assets/geojson/escolas.geojson'),
      ).then((geojson) => {
        const entries = (geojson.features ?? [])
          .map((feature) => {
            const properties = feature.properties as Record<string, unknown>;
            const coordinates = Array.isArray(feature.geometry?.coordinates)
              ? feature.geometry.coordinates
              : [];

            return {
              co_entidade: Number(properties['co_entidade']) || 0,
              no_entidade: String(properties['no_entidade'] ?? ''),
              latitude: Number(coordinates[1]) || 0,
              longitude: Number(coordinates[0]) || 0,
              no_municipio:
                properties['no_municipio'] == null ? null : String(properties['no_municipio']),
              no_tp_dependencia:
                properties['no_tp_dependencia'] == null
                  ? null
                  : String(properties['no_tp_dependencia']),
              no_tp_localizacao:
                properties['no_tp_localizacao'] == null
                  ? null
                  : String(properties['no_tp_localizacao']),
            } as EscolaGeoEntryModel;
          })
          .filter((entry) => Number.isFinite(entry.co_entidade));

        return new Map(entries.map((entry) => [entry.co_entidade, entry]));
      });
    }
    return this.escolasGeoMap$;
  }

  listarFiltros(): Observable<DadosFiltrosModel> {
    return from(this.filtrosApi.getFiltrosFiltrosGet({ painel: 'infraestrutura' })).pipe(
      map(mapFiltrosResponseToModel),
      catchError(() =>
        of({ anos: [], metricas: [], municipios: [], rede_ensino: [], tp_localizacao: [] }),
      ),
    );
  }

  listarPainel(params?: {
    ano?: number | null;
    variaveis?: string[] | null;
    municipios?: string[] | null;
    rede_ensino?: string[] | null;
    tp_localizacao?: string[] | null;
    pibid?: boolean | null;
  }): Observable<PainelInfraestruturaModel> {
    const call = async () => {
      const apiResp = await this.api.getPainelInfraestruturaInfraestruturaPainelGet({
        ano: params?.ano ?? null,
        variaveis:
          params?.variaveis as GetPainelInfraestruturaInfraestruturaPainelGet$Params['variaveis'],
        municipios: params?.municipios as string[],
        rede_ensino:
          params?.rede_ensino as GetPainelInfraestruturaInfraestruturaPainelGet$Params['rede_ensino'],
        tp_localizacao:
          params?.tp_localizacao as GetPainelInfraestruturaInfraestruturaPainelGet$Params['tp_localizacao'],
        pibid: params?.pibid ?? undefined,
      });
      return mapPainelResponseToModel(apiResp);
    };

    return from(call()).pipe(catchError(() => of({ descricao: '', graficos: {} })));
  }

  listarPainelEscolas(params?: {
    ano?: number | null;
    variaveis?: string[] | null;
    municipios?: string[] | null;
    rede_ensino?: string[] | null;
    tp_localizacao?: string[] | null;
    pibid?: boolean | null;
    page?: number;
    page_size?: number;
  }): Observable<PainelEscolasModel> {
    const call = async () => {
      const apiResp = await this.api.getPainelEscolasInfraestruturaInfraestruturaPainelEscolasGet({
        ano: params?.ano ?? null,
        variaveis:
          params?.variaveis as GetPainelEscolasInfraestruturaInfraestruturaPainelEscolasGet$Params['variaveis'],
        municipios: params?.municipios as string[],
        rede_ensino:
          params?.rede_ensino as GetPainelEscolasInfraestruturaInfraestruturaPainelEscolasGet$Params['rede_ensino'],
        tp_localizacao:
          params?.tp_localizacao as GetPainelEscolasInfraestruturaInfraestruturaPainelEscolasGet$Params['tp_localizacao'],
        pibid: params?.pibid ?? undefined,
        page: params?.page ?? 0,
        page_size: params?.page_size ?? 5,
      });
      return mapPainelEscolasResponseToModel(apiResp);
    };

    return from(call()).pipe(
      catchError(() =>
        of({
          grafico: { plotly: { data: [], layout: {} }, tipo: '', titulo: '' },
          paginacao: { page: 0, page_size: 5, total_escolas: 0, total_paginas: 0 },
        }),
      ),
    );
  }

  listarMapa(params?: {
    ano?: number | null;
    variaveis?: string[] | null;
    municipios?: string[] | null;
    rede_ensino?: string[] | null;
    tp_localizacao?: string[] | null;
    pibid?: boolean | null;
  }): Observable<MapaInfraestruturaModel> {
    const call = async () => {
      const [apiResp, geoMap] = await Promise.all([
        this.api.getMapaInfraestruturaInfraestruturaMapaGet({
          ano: params?.ano ?? null,
          variaveis:
            params?.variaveis as GetPainelInfraestruturaInfraestruturaPainelGet$Params['variaveis'],
          pibid: params?.pibid ?? undefined,
        }),
        this.getEscolasGeoMap(),
      ]);
      return mapMapaResponseToModel(apiResp, geoMap, {
        municipios: params?.municipios ?? null,
        rede_ensino: params?.rede_ensino ?? null,
        tp_localizacao: params?.tp_localizacao ?? null,
      });
    };

    return from(call()).pipe(catchError(() => of({ descricao: '', pontos: [] })));
  }

  listarAnaliseTemporal(params?: {
    metrica?: string | null;
    pibid?: boolean | null;
  }): Observable<AnaliseTemporalModel> {
    return from(
      this.api.getAnaliseTemporalInfraestruturaInfraestruturaAnaliseTemporalGet({
        metrica: (params?.metrica ??
          undefined) as GetAnaliseTemporalInfraestruturaInfraestruturaAnaliseTemporalGet$Params['metrica'],
        pibid: params?.pibid ?? undefined,
      }),
    ).pipe(
      map(mapAnaliseTemporalResponseToModel),
      catchError(() => of({ descricao: '', graficos: {}, listaGraficos: [] })),
    );
  }

  /**
   * Série 2022–2025 da escola comparada à média municipal.
   * Diferente dos demais métodos, não troca falhas por resposta vazia:
   * o erro é propagado como `ErroComparacaoMunicipioModel` para a página exibi-lo.
   */
  obterComparacaoEscolaMunicipio(coEntidade: number): Observable<ComparacaoEscolaMunicipioModel> {
    return from(
      this.api.getComparacaoInfraestruturaMunicipioInfraestruturaAnaliseTemporalEscolasCoEntidadeComparacaoMunicipioGet(
        { co_entidade: coEntidade },
      ),
    ).pipe(
      map(mapComparacaoEscolaMunicipioResponseToModel),
      catchError((erro: unknown) => throwError(() => mapComparacaoEscolaMunicipioErro(erro))),
    );
  }

  listarMapaMunicipalGeoJsonComPontos(params?: {
    ano?: number | null;
    variaveis?: string[] | null;
    municipios?: string[] | null;
    pibid?: boolean | null;
  }): Observable<MapaMunicipalComPontosModel> {
    const call = async () => {
      const [mapa, geojson] = await Promise.all([
        firstValueFrom(this.listarMapa(params)),
        firstValueFrom(
          this.http
            .get<GeoJsonFeatureCollectionModel>('assets/geojson/municipios_pibid.geojson')
            .pipe(
              catchError(() =>
                of({ type: 'FeatureCollection', features: [] } as GeoJsonFeatureCollectionModel),
              ),
            ),
        ),
      ]);

      const resumos: MapaMunicipioResumoModel[] = mapMapaMunicipioResumoFromPontos(mapa.pontos);
      return {
        collection: mapGeoJsonMunicipiosComInfraestrutura(
          geojson,
          resumos,
          params?.municipios?.map((nome) => ({ nome })) ?? null,
        ),
        pontos: mapa.pontos,
      };
    };

    return from(call()).pipe(
      catchError(() =>
        of({
          collection: {
            type: 'FeatureCollection',
            features: [],
          } as MapaMunicipioGeoJsonCollectionModel,
          pontos: [],
        }),
      ),
    );
  }
}
