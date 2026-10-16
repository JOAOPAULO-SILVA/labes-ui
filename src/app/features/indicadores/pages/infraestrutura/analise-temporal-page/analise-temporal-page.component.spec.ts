import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComparacaoInfraestruturaResponse } from '../../../../../core/api/models/comparacao-infraestrutura-response';
import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { mapComparacaoEscolaMunicipioResponseToModel } from '../../../mappers/infraestrutura.mapper';
import comparacaoMock from '../../../mocks/comparacao-escola-municipio.json';
import {
  ComparacaoEscolaMunicipioModel,
  EscolaBuscaModel,
} from '../../../models/infraestrutura.models';
import { AnaliseTemporalPageComponent } from './analise-temporal-page.component';

const ESCOLA_A: EscolaBuscaModel = {
  co_entidade: 15012345,
  nome: 'EMEF Exemplo',
  municipio: 'Belém',
  dependencia: null,
  localizacao: null,
};
const ESCOLA_B: EscolaBuscaModel = { ...ESCOLA_A, co_entidade: 15054321, nome: 'EMEF Outra' };
const MODELO = mapComparacaoEscolaMunicipioResponseToModel(
  comparacaoMock as ComparacaoInfraestruturaResponse,
);

describe('AnaliseTemporalPageComponent (infraestrutura)', () => {
  let fixture: ComponentFixture<AnaliseTemporalPageComponent>;
  let respostas: Map<number, Subject<ComparacaoEscolaMunicipioModel>>;
  const obter = vi.fn();

  const pagina = () =>
    fixture.componentInstance as unknown as {
      selecionar(e: EscolaBuscaModel): void;
      limpar(): void;
    };
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    respostas = new Map();
    obter.mockReset();
    obter.mockImplementation((co: number) => {
      const resposta = new Subject<ComparacaoEscolaMunicipioModel>();
      respostas.set(co, resposta);
      return resposta;
    });

    TestBed.configureTestingModule({
      imports: [AnaliseTemporalPageComponent],
      providers: [
        {
          provide: InfraestruturaFacade,
          useValue: {
            listarEscolasParaBusca: () => of([ESCOLA_A, ESCOLA_B]),
            obterComparacaoEscolaMunicipio: obter,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(AnaliseTemporalPageComponent);
    fixture.detectChanges();
  });

  it('não chama a API antes da seleção e orienta o usuário', () => {
    expect(obter).not.toHaveBeenCalled();
    expect(texto()).toContain('Selecione uma escola para começar.');
  });

  it('mostra carregamento e depois o resultado', () => {
    pagina().selecionar(ESCOLA_A);
    fixture.detectChanges();
    expect(obter).toHaveBeenCalledWith(15012345);
    expect(
      fixture.nativeElement.querySelector('.comparacao-conteudo [aria-busy="true"]'),
    ).not.toBeNull();

    respostas.get(15012345)!.next(MODELO);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-comparacao-resumo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-comparacao-grafico')).not.toBeNull();
  });

  it('a nova escola substitui a anterior, mesmo que a anterior responda depois', () => {
    pagina().selecionar(ESCOLA_A);
    pagina().selecionar(ESCOLA_B);
    fixture.detectChanges();

    expect(respostas.get(15012345)!.observed).toBe(false);

    respostas.get(15012345)!.next(MODELO);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-comparacao-grafico')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.comparacao-conteudo [aria-busy="true"]'),
    ).not.toBeNull();
  });

  it('mostra o erro de forma explícita', () => {
    pagina().selecionar(ESCOLA_A);
    respostas.get(15012345)!.error({
      codigo: 'warehouse_unavailable',
      mensagem: 'Os dados de infraestrutura estão temporariamente indisponíveis.',
    });
    fixture.detectChanges();

    expect(texto()).toContain('Não foi possível carregar a comparação.');
    expect(texto()).toContain('temporariamente indisponíveis');
    expect(texto()).toContain('Tentar novamente');
  });

  it('volta ao estado inicial ao limpar', () => {
    pagina().selecionar(ESCOLA_A);
    respostas.get(15012345)!.next(MODELO);
    pagina().limpar();
    fixture.detectChanges();

    expect(texto()).toContain('Selecione uma escola para começar.');
  });
});
