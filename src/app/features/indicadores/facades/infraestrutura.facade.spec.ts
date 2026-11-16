import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiConfiguration } from '../../../core/api/api-configuration';
import comparacaoMock from '../mocks/comparacao-escola-municipio.json';
import { InfraestruturaFacade } from './infraestrutura.facade';

const ROOT = 'http://api.teste';
const urlComparacao = (co: number) =>
  `${ROOT}/infraestrutura/analise-temporal/escolas/${co}/comparacao-municipio`;

describe('InfraestruturaFacade.obterComparacaoEscolaMunicipio', () => {
  let facade: InfraestruturaFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(ApiConfiguration).rootUrl = ROOT;
    facade = TestBed.inject(InfraestruturaFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consome a rota nova com o co_entidade e devolve o modelo', async () => {
    const resultado = firstValueFrom(facade.obterComparacaoEscolaMunicipio(15012345));

    const req = http.expectOne(urlComparacao(15012345));
    expect(req.request.method).toBe('GET');
    req.flush(comparacaoMock);

    const modelo = await resultado;
    expect(modelo.escola.co_entidade).toBe(15012345);
    expect(modelo.serie).toHaveLength(4);
  });

  it('propaga o erro em vez de devolver resposta vazia', async () => {
    const resultado = firstValueFrom(facade.obterComparacaoEscolaMunicipio(15099999));

    http
      .expectOne(urlComparacao(15099999))
      .flush(
        { code: 'not_found', message: 'Escola não encontrada.' },
        { status: 404, statusText: 'Not Found' },
      );

    await expect(resultado).rejects.toEqual({
      codigo: 'not_found',
      mensagem: 'Escola não encontrada na fonte consultada.',
    });
  });

  it('tenta carregar o catálogo de escolas de novo depois de uma falha', async () => {
    const primeira = firstValueFrom(facade.listarEscolasParaBusca());
    http
      .expectOne('assets/geojson/escolas.geojson')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await expect(primeira).rejects.toBeTruthy();

    const segunda = firstValueFrom(facade.listarEscolasParaBusca());
    http.expectOne('assets/geojson/escolas.geojson').flush({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.5, -1.4] },
          properties: {
            co_entidade: '15012345',
            no_entidade: 'EMEF Exemplo',
            no_municipio: 'Belém',
          },
        },
      ],
    });

    expect(await segunda).toEqual([
      {
        co_entidade: 15012345,
        nome: 'EMEF Exemplo',
        municipio: 'Belém',
        codigoMunicipio: null,
        dependencia: null,
        localizacao: null,
      },
    ]);
  });

  it('cancela a requisição HTTP ao cancelar a inscrição', () => {
    const inscricao = facade.obterComparacaoEscolaMunicipio(15012345).subscribe();
    const req = http.expectOne(urlComparacao(15012345));

    inscricao.unsubscribe();

    expect(req.cancelled).toBe(true);
  });
});

describe('InfraestruturaFacade.obterVisaoTemporalMunicipio (BE15)', () => {
  let facade: InfraestruturaFacade;
  let http: HttpTestingController;
  const urlMunicipio = `${ROOT}/infraestrutura/analise-temporal/municipios/1501402`;
  const recorte = {
    rede_ensino: ['Municipal' as const],
    ano_inicio: 2023,
    ano_fim: 2025,
    indicadores: ['in_banheiro', 'in_cozinha'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(ApiConfiguration).rootUrl = ROOT;
    facade = TestBed.inject(InfraestruturaFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia o recorte como query e devolve a série em ordem de ano', async () => {
    const resultado = firstValueFrom(facade.obterVisaoTemporalMunicipio(1501402, recorte));

    const req = http.expectOne((r) => r.url === urlMunicipio);
    expect(req.request.params.getAll('rede_ensino')).toEqual(['Municipal']);
    expect(req.request.params.get('ano_inicio')).toBe('2023');
    expect(req.request.params.get('ano_fim')).toBe('2025');
    expect(req.request.params.getAll('indicadores')).toEqual(['in_banheiro', 'in_cozinha']);

    const ano = (n: number, situacao: string, cobertura: number | null) => ({
      ano: n,
      situacao,
      cobertura_media_percentual: cobertura,
      quantidade_escolas: situacao === 'denominador_zero' ? 0 : 10,
      quantidade_escolas_com_informacao: cobertura === null ? 0 : 9,
      quantidade_escolas_sem_dados: cobertura === null ? 0 : 1,
      indicadores: {},
    });
    req.flush({
      descricao: 'analise_temporal_infraestrutura_municipio',
      data: {
        filtros: { ...recorte },
        municipio: { co_municipio: 1501402, no_municipio: 'Belém' },
        metodologia: {
          avisos: [],
          formula: 'media_simples_indices_escolares',
          homologada: false,
          versao: 'infraestrutura-municipio-v1-req07-provisoria',
        },
        serie: [ano(2025, 'denominador_zero', null), ano(2023, 'com_dados', 75.56)],
      },
    });

    const modelo = await resultado;
    expect(modelo.municipio.no_municipio).toBe('Belém');
    expect(modelo.serie.map((p) => [p.ano, p.situacao, p.cobertura_media_percentual])).toEqual([
      [2023, 'com_dados', 75.56],
      [2025, 'denominador_zero', null],
    ]);
  });

  it('traduz o 404 para a mensagem do município', async () => {
    const resultado = firstValueFrom(facade.obterVisaoTemporalMunicipio(1501402, recorte));
    http
      .expectOne((r) => r.url === urlMunicipio)
      .flush(
        { code: 'not_found', message: 'Municipio nao encontrado.' },
        { status: 404, statusText: 'Not Found' },
      );

    await expect(resultado).rejects.toEqual({
      codigo: 'not_found',
      mensagem: 'Município não encontrado na fonte consultada.',
    });
  });

  it('cancela a requisição HTTP ao cancelar a inscrição', () => {
    const inscricao = facade.obterVisaoTemporalMunicipio(1501402, recorte).subscribe();
    const req = http.expectOne((r) => r.url === urlMunicipio);
    inscricao.unsubscribe();
    expect(req.cancelled).toBe(true);
  });
});
