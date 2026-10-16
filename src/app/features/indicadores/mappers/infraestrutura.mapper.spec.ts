import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { ComparacaoInfraestruturaResponse } from '../../../core/api/models/comparacao-infraestrutura-response';
import comparacaoMock from '../mocks/comparacao-escola-municipio.json';
import {
  mapComparacaoEscolaMunicipioErro,
  mapComparacaoEscolaMunicipioResponseToModel,
} from './infraestrutura.mapper';

const resposta = comparacaoMock as ComparacaoInfraestruturaResponse;

describe('mapComparacaoEscolaMunicipioResponseToModel', () => {
  const modelo = mapComparacaoEscolaMunicipioResponseToModel(resposta);

  it('mapeia escola, município e metadados', () => {
    expect(modelo.escola).toEqual({ co_entidade: 15012345, no_entidade: 'EMEF Exemplo' });
    expect(modelo.municipio).toEqual({ co_municipio: 1501402, no_municipio: 'Belém' });
    expect(modelo.metodologia.homologada).toBe(false);
    expect(modelo.metodologia.total_indicadores).toBe(17);
    expect(modelo.metodologia.indicadores).toHaveLength(17);
    expect(modelo.metodologia.cobertura_minima_percentual).toBeNull();
  });

  it('mantém um ponto por ano da série', () => {
    expect(modelo.serie.map((p) => p.ano)).toEqual([2022, 2023, 2024, 2025]);
  });

  it('preserva nulos em vez de convertê-los em zero', () => {
    const semDados = modelo.serie.find((p) => p.ano === 2024)!;
    expect(semDados.situacao).toBe('escola_sem_dados');
    expect(semDados.indice_escola_percentual).toBeNull();
    expect(semDados.media_municipal_percentual).toBeNull();
    expect(semDados.diferenca_pontos_percentuais).toBeNull();
    expect(semDados.cobertura_pares_percentual).toBeNull();
  });

  it('representa a quantidade de pares', () => {
    const disponivel = modelo.serie.find((p) => p.ano === 2022)!;
    expect(disponivel.quantidade_pares_validos).toBe(85);
    expect(disponivel.denominador_pares).toBe(94);

    const semPares = modelo.serie.find((p) => p.ano === 2025)!;
    expect(semPares.situacao).toBe('sem_pares_validos');
    expect(semPares.indice_escola_percentual).toBe(70.59);
    expect(semPares.quantidade_pares_validos).toBe(0);
    expect(semPares.media_municipal_percentual).toBeNull();
  });

  it('não altera a resposta original', () => {
    const copia = structuredClone(resposta);
    mapComparacaoEscolaMunicipioResponseToModel(resposta);
    expect(resposta).toEqual(copia);
  });
});

describe('mapComparacaoEscolaMunicipioErro', () => {
  const httpErro = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  it('usa o código e a mensagem enviados pela API', () => {
    const erro = mapComparacaoEscolaMunicipioErro(
      httpErro(503, {
        code: 'warehouse_unavailable',
        message: 'Não foi possível consultar os dados de infraestrutura.',
      }),
    );
    expect(erro).toEqual({
      codigo: 'warehouse_unavailable',
      mensagem: 'Não foi possível consultar os dados de infraestrutura.',
    });
  });

  it.each([
    [0, 'network_error'],
    [404, 'not_found'],
    [422, 'validation_error'],
    [503, 'warehouse_unavailable'],
    [500, 'internal_error'],
  ])('classifica status %i como %s', (status, codigo) => {
    const erro = mapComparacaoEscolaMunicipioErro(httpErro(status));
    expect(erro.codigo).toBe(codigo);
    expect(erro.mensagem).not.toBe('');
  });

  it('trata erros que não são HTTP como erro interno', () => {
    expect(mapComparacaoEscolaMunicipioErro(new Error('boom')).codigo).toBe('internal_error');
  });
});
