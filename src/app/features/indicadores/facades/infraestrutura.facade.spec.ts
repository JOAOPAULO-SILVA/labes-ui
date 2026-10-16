import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComparacaoInfraestruturaResponse } from '../../../core/api/models/comparacao-infraestrutura-response';
import { InfraestruturaService } from '../../../core/api/services/infraestrutura.service';
import comparacaoMock from '../mocks/comparacao-escola-municipio.json';
import { InfraestruturaFacade } from './infraestrutura.facade';

describe('InfraestruturaFacade.obterComparacaoEscolaMunicipio', () => {
  const obterComparacao = vi.fn();
  let facade: InfraestruturaFacade;

  beforeEach(() => {
    obterComparacao.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        {
          provide: InfraestruturaService,
          useValue: {
            getComparacaoInfraestruturaMunicipioInfraestruturaAnaliseTemporalEscolasCoEntidadeComparacaoMunicipioGet:
              obterComparacao,
          },
        },
      ],
    });
    facade = TestBed.inject(InfraestruturaFacade);
  });

  it('consome a rota com o co_entidade e devolve o modelo', async () => {
    obterComparacao.mockResolvedValue(comparacaoMock as ComparacaoInfraestruturaResponse);

    const modelo = await firstValueFrom(facade.obterComparacaoEscolaMunicipio(15012345));

    expect(obterComparacao).toHaveBeenCalledWith({ co_entidade: 15012345 });
    expect(modelo.escola.co_entidade).toBe(15012345);
    expect(modelo.serie).toHaveLength(4);
  });

  it('propaga o erro em vez de devolver resposta vazia', async () => {
    obterComparacao.mockRejectedValue(
      new HttpErrorResponse({
        status: 404,
        error: { code: 'not_found', message: 'Escola não encontrada.' },
      }),
    );

    await expect(firstValueFrom(facade.obterComparacaoEscolaMunicipio(15099999))).rejects.toEqual({
      codigo: 'not_found',
      mensagem: 'Escola não encontrada.',
    });
  });
});
