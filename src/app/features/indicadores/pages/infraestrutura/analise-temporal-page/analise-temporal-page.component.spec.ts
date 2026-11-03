import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
const ESCOLA_B: EscolaBuscaModel = {
  ...ESCOLA_A,
  co_entidade: 15054321,
  nome: 'EMEF Outra',
  municipio: 'Ananindeua',
};
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
  const composicaoPagina = () =>
    fixture.componentInstance as unknown as { onAnoComposicaoChange(ano: number): void };
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
    expect(
      (
        fixture.componentInstance as unknown as { municipioSelecionado(): string | null }
      ).municipioSelecionado(),
    ).toBe('Belém');
  });

  it('filtra as escolas pelo município e desmarca escola de outro município', () => {
    const instancia = fixture.componentInstance as unknown as {
      opcoesEscola(): { value: number }[];
      opcoesMunicipio(): { label: string }[];
      onMunicipioChange(m: string | null): void;
      escolaSelecionada(): EscolaBuscaModel | null;
    };
    expect(instancia.opcoesMunicipio().map((m) => m.label)).toEqual(['Ananindeua', 'Belém']);

    instancia.onMunicipioChange('Ananindeua');
    expect(instancia.opcoesEscola().map((e) => e.value)).toEqual([ESCOLA_B.co_entidade]);

    pagina().onEscolaChange(ESCOLA_B.co_entidade);
    instancia.onMunicipioChange('Belém');
    expect(instancia.escolaSelecionada()).toBeNull();
    expect(instancia.opcoesEscola().map((e) => e.value)).toEqual([ESCOLA_A.co_entidade]);

    instancia.onMunicipioChange(null);
    expect(instancia.opcoesEscola()).toHaveLength(2);
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

  const itensComposicao = (classe: string) =>
    el().querySelectorAll(`.composicao__item--${classe}`).length;

  it('mostra carregamento e erro também na composição', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    fixture.detectChanges();
    expect(el().querySelector('.composicao')?.getAttribute('aria-busy')).toBe('true');
    expect(itensComposicao('skeleton')).toBe(17);

    respostas.get(15012345)!.error({ codigo: 'internal_error', mensagem: 'Erro.' });
    fixture.detectChanges();
    expect(texto()).toContain('Não foi possível carregar a composição do índice.');
    expect(el().querySelectorAll('.composicao__item')).toHaveLength(0);
  });

  it('renderiza os 17 indicadores reais do último ano: 1 = Sim, 0 = Não', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    fixture.detectChanges();

    expect(el().querySelector('#composicao-titulo')?.textContent).toContain('2025');
    expect(el().querySelectorAll('.composicao__item')).toHaveLength(17);
    expect(itensComposicao('sim')).toBe(12);
    expect(itensComposicao('nao')).toBe(5);
    expect(texto()).toContain('12 de 17 indicadores válidos presentes (17 no total).');
  });

  it('atualiza a composição ao trocar o ano, com NULL como Sem dados', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    composicaoPagina().onAnoComposicaoChange(2023);
    fixture.detectChanges();

    expect(itensComposicao('sim')).toBe(7);
    expect(itensComposicao('nao')).toBe(3);
    expect(itensComposicao('sem_dados')).toBe(7);
    expect(texto()).toContain('Sem dados');
  });

  it('informa ano sem registro da escola em vez de mostrar indicadores', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    composicaoPagina().onAnoComposicaoChange(2024);
    fixture.detectChanges();

    expect(texto()).toContain('A escola não possui registro no Censo Escolar de 2024.');
    expect(el().querySelectorAll('.composicao__item')).toHaveLength(0);
  });

  it('volta ao último ano ao trocar de escola', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    composicaoPagina().onAnoComposicaoChange(2023);
    pagina().onEscolaChange(ESCOLA_B.co_entidade);
    respostas.get(15054321)!.next(MODELO);
    fixture.detectChanges();

    expect(el().querySelector('#composicao-titulo')?.textContent).toContain('2025');
  });

  describe('painel territorial (FE10)', () => {
    const territorial = () => el().querySelector('.territorial') as HTMLElement;
    const textoTerritorial = () => territorial().textContent ?? '';
    const carregar = (ano?: number) => {
      pagina().onEscolaChange(ESCOLA_A.co_entidade);
      respostas.get(15012345)!.next(MODELO);
      if (ano) composicaoPagina().onAnoComposicaoChange(ano);
      fixture.detectChanges();
    };

    it('mostra os mesmos indicadores, na mesma ordem, da composição da escola', () => {
      carregar(2022);
      const escola = [...el().querySelectorAll('.composicao__label')].map((e) => e.textContent);
      const municipio = [...territorial().querySelectorAll('.territorial__label')].map(
        (e) => e.textContent,
      );
      expect(municipio).toHaveLength(17);
      expect(municipio).toEqual(escola);
    });

    it('explicita município e ano e mostra presentes, válidos, percentual e sem dados', () => {
      carregar(2022);
      expect(textoTerritorial()).toContain('Belém · 2022');
      expect(textoTerritorial()).toContain('94 escolas de referência');
      const primeiro = territorial().querySelector('.territorial__item')!;
      expect(primeiro.textContent).toContain('12 de 85');
      expect(primeiro.textContent).toContain('14,12%');
      expect(primeiro.textContent).toContain('9 sem dados');
      expect(primeiro.getAttribute('title')).toContain('9 sem informação');
    });

    it('exibe aviso de cobertura baixa sem ocultar os dados nem tratá-lo como homologado', () => {
      carregar(2023);
      expect(territorial().querySelector('.territorial__aviso')).not.toBeNull();
      expect(territorial().querySelectorAll('.territorial__item')).toHaveLength(17);
      expect(textoTerritorial()).toContain('provisório');
      expect(textoTerritorial()).not.toMatch(/homologado pelo professor|limite aprovado/i);
    });

    it('não exibe o aviso quando a cobertura da escola não é baixa', () => {
      carregar(2022);
      expect(territorial().querySelector('.territorial__aviso')).toBeNull();
    });

    it('mostra Sem dados no percentual quando nenhuma escola tem informação válida', () => {
      carregar(2025);
      expect(territorial().querySelector('.territorial__percentual')?.textContent).toBe(
        'Sem dados',
      );
    });

    it('informa ausência de pares quando não há outras escolas', () => {
      pagina().onEscolaChange(ESCOLA_A.co_entidade);
      respostas.get(15012345)!.next({
        ...MODELO,
        serie: MODELO.serie.map((p) => ({
          ...p,
          composicao_municipal: null,
          denominador_pares: 0,
        })),
      });
      composicaoPagina().onAnoComposicaoChange(2022);
      fixture.detectChanges();
      expect(textoTerritorial()).toContain(
        'Não há outras escolas do município com registro em 2022 para compor a referência.',
      );
    });

    it('informa ano sem registro, carregamento e erro', () => {
      carregar(2024);
      expect(textoTerritorial()).toContain('Sem referência territorial em 2024');

      pagina().onEscolaChange(ESCOLA_B.co_entidade);
      fixture.detectChanges();
      expect(territorial().getAttribute('aria-busy')).toBe('true');

      respostas.get(15054321)!.error({ codigo: 'internal_error', mensagem: 'Erro.' });
      fixture.detectChanges();
      expect(textoTerritorial()).toContain('Não foi possível carregar a composição territorial.');
    });
  });

  it('volta ao estado inicial ao limpar', () => {
    pagina().onEscolaChange(ESCOLA_A.co_entidade);
    respostas.get(15012345)!.next(MODELO);
    pagina().onEscolaChange(null);
    fixture.detectChanges();

    expect(texto()).toContain('Selecione uma escola para visualizar a evolução temporal.');
    expect(valoresCartoes()[0]).toBe('Sem dados');
  });

  it('mostra os avisos de limitação e metodologia só no fim das regras (REQ-04, item 4)', () => {
    const regras = [...el().querySelectorAll('.regras li')].map((li) => li.textContent?.trim());
    expect(regras.slice(-2)).toEqual([
      'O índice representa disponibilidade de infraestrutura, não qualidade escolar.',
      'Esta análise utiliza uma metodologia de cálculo em caráter provisório e pendente de homologação.',
    ]);

    const ocorrencias = texto().split('não qualidade escolar').length - 1;
    expect(ocorrencias).toBe(1);
  });
});
