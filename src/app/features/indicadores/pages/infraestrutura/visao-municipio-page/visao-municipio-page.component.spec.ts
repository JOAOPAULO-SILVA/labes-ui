import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { INDICADORES_METODOLOGIA } from '../../../mappers/comparacao-grafico.mapper';
import {
  PontoMunicipioModel,
  VisaoTemporalMunicipioModel,
} from '../../../models/infraestrutura.models';
import { VisaoMunicipioPageComponent } from './visao-municipio-page.component';

const BELEM = 1501402;

const ponto = (ano: number, parcial: Partial<PontoMunicipioModel> = {}): PontoMunicipioModel => ({
  ano,
  situacao: 'com_dados',
  cobertura_media_percentual: 70 + (ano - 2022),
  quantidade_escolas: 120,
  quantidade_escolas_com_informacao: 110,
  quantidade_escolas_sem_dados: 10,
  indicadores: {},
  ...parcial,
});
const ZERO = {
  situacao: 'denominador_zero',
  cobertura_media_percentual: null,
  quantidade_escolas: 0,
  quantidade_escolas_com_informacao: 0,
  quantidade_escolas_sem_dados: 0,
} as const;

const visao = (serie: PontoMunicipioModel[]): VisaoTemporalMunicipioModel => ({
  filtros: { rede_ensino: [], ano_inicio: 2022, ano_fim: 2025, indicadores: [] },
  municipio: { co_municipio: BELEM, no_municipio: 'Belém' },
  metodologia: {
    versao: 'infraestrutura-municipio-v1-req07-provisoria',
    homologada: false,
    formula: 'media_simples_indices_escolares',
    avisos: [],
  },
  serie,
});

interface Pagina {
  alterar(f: Record<string, unknown>): void;
  onAnosChange(anos: [number, number]): void;
  aplicar(): void;
  limpar(): void;
  tentarNovamente(): void;
  aplicarDesabilitado(): boolean;
  opcoesMunicipio(): { label: string; value: number }[];
}

describe('VisaoMunicipioPageComponent (FE16)', () => {
  let fixture: ComponentFixture<VisaoMunicipioPageComponent>;
  let resposta: Subject<VisaoTemporalMunicipioModel>;
  const obter = vi.fn();

  const pagina = () => fixture.componentInstance as unknown as Pagina;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent ?? '';
  const valoresCartoes = () =>
    [...el().querySelectorAll('.resumo-card__valor')].map((v) => v.textContent?.trim());
  const cartoesAno = () =>
    [...el().querySelectorAll('.cartao-ano')].map((c) =>
      [...c.querySelectorAll('span, strong, li')].map((n) => n.textContent?.trim()).join(' '),
    );

  const aplicarBelem = () => {
    pagina().alterar({ municipio: BELEM });
    pagina().aplicar();
    TestBed.tick();
  };
  const responder = (serie: PontoMunicipioModel[]) => {
    resposta.next(visao(serie));
    fixture.detectChanges();
  };

  beforeEach(() => {
    obter.mockReset();
    obter.mockImplementation(() => {
      resposta = new Subject<VisaoTemporalMunicipioModel>();
      return resposta;
    });
    TestBed.configureTestingModule({
      imports: [VisaoMunicipioPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: InfraestruturaFacade,
          useValue: {
            listarFiltros: () =>
              of({
                metricas: [],
                anos: [2022, 2023, 2024, 2025],
                municipios: [
                  { codigo: BELEM, nome: 'Belém' },
                  { codigo: 1500800, nome: 'Ananindeua' },
                ],
              }),
            listarEscolasParaBusca: () => of([]),
            obterVisaoTemporalMunicipio: obter,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(VisaoMunicipioPageComponent);
    fixture.detectChanges();
  });

  it('tela padrão: não consulta a API, mostra o texto inicial e os anos "Sem dados"', () => {
    expect(obter).not.toHaveBeenCalled();
    expect(texto()).toContain(
      'Acompanhe a evolução da cobertura de infraestrutura da rede municipal.',
    );
    expect(texto()).toContain('Selecione um município para visualizar a evolução temporal.');
    expect(valoresCartoes()).toEqual(['Sem dados', 'Sem dados', 'Sem dados', '17']);
    expect(cartoesAno()).toEqual([
      '2022 Sem dados Selecione um município',
      '2023 Sem dados Selecione um município',
      '2024 Sem dados Selecione um município',
      '2025 Sem dados Selecione um município',
    ]);
    expect(texto()).not.toContain('Os cartões abaixo indicam');
  });

  it('lista os municípios de /filtros em ordem alfabética', () => {
    expect(pagina().opcoesMunicipio()).toEqual([
      { label: 'Ananindeua', value: 1500800 },
      { label: 'Belém', value: BELEM },
    ]);
  });

  it('"Aplicar" exige município e ao menos um indicador; nada é consultado antes', () => {
    expect(pagina().aplicarDesabilitado()).toBe(true);
    pagina().alterar({ municipio: BELEM });
    TestBed.tick();
    expect(obter).not.toHaveBeenCalled();
    expect(pagina().aplicarDesabilitado()).toBe(false);

    pagina().alterar({ indicadores: [] });
    expect(pagina().aplicarDesabilitado()).toBe(true);
    pagina().aplicar();
    TestBed.tick();
    expect(obter).not.toHaveBeenCalled();
  });

  it('envia município, rede, anos e indicadores ao aplicar', () => {
    pagina().alterar({ municipio: BELEM, rede: 'Municipal', indicadores: ['in_banheiro'] });
    pagina().onAnosChange([2023, 2024]);
    pagina().aplicar();
    TestBed.tick();

    expect(obter).toHaveBeenCalledWith(BELEM, {
      rede_ensino: ['Municipal'],
      ano_inicio: 2023,
      ano_fim: 2024,
      indicadores: ['in_banheiro'],
    });
  });

  it('por padrão consulta todos os anos e os 17 indicadores', () => {
    aplicarBelem();
    expect(obter).toHaveBeenCalledWith(BELEM, {
      rede_ensino: [],
      ano_inicio: 2022,
      ano_fim: 2025,
      indicadores: [...INDICADORES_METODOLOGIA],
    });
  });

  it('com dados: cartões do último ano, aviso do ano, gráfico e cartões por ano', () => {
    aplicarBelem();
    responder([ponto(2022), ponto(2023), ponto(2024), ponto(2025)]);

    expect(texto()).toContain(
      'Os cartões abaixo indicam um resumo de 2025 (Último ano disponível).',
    );
    expect(valoresCartoes()).toEqual(['120', '110', '73%', '17']);
    expect(texto()).toContain('Rede de Belém');
    expect(el().querySelector('plotly-plot')).not.toBeNull();
    expect(cartoesAno()[0]).toBe(
      '2022 70% Cobertura da rede 120 escolas elegíveis 110 com informação válida 10 sem dados',
    );
    expect(texto()).not.toContain('Como interpretar');
  });

  it('sem dados no período: mensagem do gráfico e cartões "Sem dados", sem aviso do ano', () => {
    aplicarBelem();
    responder([]);

    expect(el().querySelector('plotly-plot')).toBeNull();
    expect(texto()).toContain(
      'Não existem dados de infraestrutura suficientes para desenhar a evolução temporal deste item no período selecionado.',
    );
    expect(valoresCartoes()).toEqual(['Sem dados', 'Sem dados', 'Sem dados', '17']);
    expect(texto()).not.toContain('Os cartões abaixo indicam');
    expect(cartoesAno()[0]).toContain('Cobertura indisponível');
  });

  it('denominador zero: "Não calculada", mensagem própria e "Como interpretar"', () => {
    aplicarBelem();
    responder([ponto(2022, ZERO), ponto(2023, ZERO), ponto(2024, ZERO), ponto(2025, ZERO)]);

    expect(texto()).toContain('Não existem escolas registradas por meio do filtro aplicado.');
    expect(valoresCartoes()).toEqual(['0', '0', 'Não calculada', '17']);
    expect(cartoesAno()[0]).toBe(
      '2022 Não calculada Cobertura da rede 0 escolas elegíveis 0 com informação válida Denominador zero',
    );
    expect(texto()).toContain('Como interpretar');
    expect(texto()).toContain('Denominador zero não representa cobertura de 0%');
  });

  it('dados parciais: desenha o gráfico e mostra o ano sem dados no último cartão', () => {
    aplicarBelem();
    responder([ponto(2022), ponto(2023), ponto(2024)]);

    expect(el().querySelector('plotly-plot')).not.toBeNull();
    expect(valoresCartoes()).toEqual(['Sem dados', 'Sem dados', 'Sem dados', '17']);
    expect(cartoesAno()[3]).toContain('2025 Sem dados');
  });

  it('erro recuperável mostra a mensagem da REQ07 e "Tentar novamente" repete a consulta', () => {
    aplicarBelem();
    resposta.error({
      codigo: 'warehouse_unavailable',
      mensagem: 'Erro de carregamento.',
    });
    fixture.detectChanges();

    expect(texto()).toContain('Erro de carregamento.');
    const botao = el().querySelector('.btn-acao') as HTMLButtonElement;
    expect(botao.textContent?.trim()).toBe('Tentar novamente');

    pagina().tentarNovamente();
    TestBed.tick();
    expect(obter).toHaveBeenCalledTimes(2);
  });

  it('município não encontrado não oferece "Tentar novamente"', () => {
    aplicarBelem();
    resposta.error({
      codigo: 'not_found',
      mensagem: 'Município não encontrado na fonte consultada.',
    });
    fixture.detectChanges();

    expect(texto()).toContain('Município não encontrado na fonte consultada.');
    expect(el().querySelector('.btn-acao')).toBeNull();
  });

  it('"Limpar" volta à tela padrão', () => {
    aplicarBelem();
    responder([ponto(2022), ponto(2023), ponto(2024), ponto(2025)]);

    pagina().limpar();
    TestBed.tick();
    fixture.detectChanges();

    expect(texto()).toContain('Selecione um município para visualizar a evolução temporal.');
    expect(pagina().aplicarDesabilitado()).toBe(true);
  });

  it('mostra as cinco regras da aba Município e a aba Município nas abas', () => {
    const regras = [...el().querySelectorAll('.regras li')].map((li) => li.textContent?.trim());
    expect(regras).toEqual([
      'Sim = 1 | Não = 0 | Sem informação = excluída do cálculo.',
      'A cobertura municipal é a média dos índices das escolas elegíveis com informação válida.',
      'Todos os indicadores possuem o mesmo peso.',
      'Esta análise utiliza metodologia de cálculo em caráter provisório e pendente de homologação.',
      'O índice representa disponibilidade de infraestrutura, não qualidade escolar.',
    ]);
    const abas = [...el().querySelectorAll('.abas__aba')].map((a) => a.textContent?.trim());
    expect(abas).toEqual(['Análise por Escola', 'Análise por Município']);
  });
});
