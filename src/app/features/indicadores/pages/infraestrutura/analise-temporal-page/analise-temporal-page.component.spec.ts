import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComparacaoInfraestruturaResponse } from '../../../../../core/api/models/comparacao-infraestrutura-response';
import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { mapComparacaoEscolaMunicipioResponseToModel } from '../../../mappers/infraestrutura.mapper';
import comparacaoMock from '../../../mocks/comparacao-escola-municipio.json';
import comparacaoComIndicadoresMock from '../../../mocks/comparacao-escola-municipio-com-indicadores.json';
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
      onEscolaChange(co: number | null): void;
      tentarNovamente(): void;
    };
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent ?? '';
  const valoresCartoes = () =>
    [...el().querySelectorAll('.resumo-card__valor')].map((v) => v.textContent?.trim());

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
        provideRouter([]),
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

  it('não chama a API antes da seleção e mostra o layout completo sem dados', () => {
    // A facade de teste só expõe o catálogo local e a comparação: qualquer outra chamada falharia.
    expect(obter).not.toHaveBeenCalled();
    expect(valoresCartoes()).toEqual(['Sem dados', 'Sem dados', 'Sem dados', 'Sem dados']);
    expect(texto()).toContain('Selecione uma escola para visualizar a evolução temporal.');
    expect(texto()).toContain('Composição do índice');
    expect(texto()).toContain('Regras metodológicas');
    expect(texto()).toContain(
      'O índice representa disponibilidade de infraestrutura, não qualidade escolar.',
    );
  });

  it('lista cada escola com nome e município e preenche o município ao selecionar', () => {
    const instancia = fixture.componentInstance as unknown as {
      opcoesEscola(): { label: string; value: number; description: string }[];
      opcoesMunicipio(): { label: string }[];
    };
    expect(instancia.opcoesEscola()[0]).toEqual({
      label: 'EMEF Exemplo',
      value: 15012345,
      description: 'Belém · INEP 15012345',
    });

    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    expect(instancia.opcoesMunicipio()).toEqual([{ label: 'Belém', value: 'Belém' }]);
  });

  it('mostra carregamento e depois o resultado', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    fixture.detectChanges();
    expect(obter).toHaveBeenCalledWith(15012345);
    expect(el().querySelector('.comparacao-resumo[aria-busy="true"]')).not.toBeNull();

    respostas.get(15012345)!.next(MODELO);
    fixture.detectChanges();
    expect(texto()).toContain('Os cartões abaixo indicam um resumo de 2025');
    expect(valoresCartoes()[0]).toBe('70,59%');
    expect(el().querySelector('plotly-plot')).not.toBeNull();
  });

  it('a nova escola substitui a anterior, mesmo que a anterior responda depois', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    pagina().onEscolaChange(ESCOLA_B.co_entidade);
    fixture.detectChanges();

    expect(respostas.get(15012345)!.observed).toBe(false);

    respostas.get(15012345)!.next(MODELO);
    fixture.detectChanges();
    expect(el().querySelector('plotly-plot')).toBeNull();
    expect(el().querySelector('.comparacao-resumo[aria-busy="true"]')).not.toBeNull();
  });

  it('mostra o erro dentro da área do gráfico, mantendo o layout', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.error({
      codigo: 'warehouse_unavailable',
      mensagem: 'Erro ao carregar os dados. A fonte de dados está indisponível.',
    });
    fixture.detectChanges();

    const area = el().querySelector('.grafico-vazio__mensagem') as HTMLElement;
    expect(area.textContent).toContain('A fonte de dados está indisponível.');
    expect(area.getAttribute('role')).toBe('alert');
    expect(area.textContent).toContain('Tentar novamente');
    expect(valoresCartoes()).toEqual(['Sem dados', 'Sem dados', 'Sem dados', 'Sem dados']);
    expect(texto()).toContain('Regras metodológicas');
  });

  it('não oferece tentar de novo quando a escola não existe', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.error({
      codigo: 'not_found',
      mensagem: 'Escola não encontrada na fonte consultada.',
    });
    fixture.detectChanges();

    expect(texto()).toContain('Escola não encontrada na fonte consultada.');
    expect(el().querySelector('.btn-acao')).toBeNull();
  });

  it('mostra dados insuficientes quando a escola não tem nenhum ano calculável', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next({
      ...MODELO,
      serie: MODELO.serie.map((p) => ({
        ...p,
        situacao: 'escola_sem_dados',
        indice_escola_percentual: null,
      })),
    });
    fixture.detectChanges();

    expect(texto()).toContain(
      'Não existem dados de infraestrutura suficientes para desenhar a evolução temporal desta escola.',
    );
    expect(el().querySelector('plotly-plot')).toBeNull();
  });

  it('avisa que a API ainda não detalha os indicadores', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    fixture.detectChanges();

    expect(texto()).toContain('O detalhamento por indicador ainda não é fornecido pela API.');
    expect(texto()).toContain('Água potável');
  });

  it('preenche a composição quando a resposta traz os indicadores (contrato proposto)', () => {
    const comIndicadores = mapComparacaoEscolaMunicipioResponseToModel(
      comparacaoComIndicadoresMock as unknown as ComparacaoInfraestruturaResponse,
    );
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(comIndicadores);
    fixture.detectChanges();

    const itens = el().querySelectorAll('.composicao__item');
    expect(itens).toHaveLength(17);
    expect(el().querySelectorAll('.composicao__item--sim')).toHaveLength(12);
    expect(el().querySelectorAll('.composicao__item--nao')).toHaveLength(5);
    expect(texto()).not.toContain('O detalhamento por indicador ainda não é fornecido pela API.');
  });

  it('volta ao estado inicial ao limpar', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    pagina().onEscolaChange(null);
    fixture.detectChanges();

    expect(texto()).toContain('Selecione uma escola para visualizar a evolução temporal.');
    expect(valoresCartoes()[0]).toBe('Sem dados');
  });
});
