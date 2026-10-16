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
      mensagem: 'Escola não encontrada.',
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
