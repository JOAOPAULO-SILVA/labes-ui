import { describe, expect, it } from 'vitest';

import { PontoMunicipioModel } from '../models/infraestrutura.models';
import {
  FILTROS_MUNICIPIO_PADRAO,
  classificarSerieMunicipio,
  montarCartaoAno,
  montarCartoesAnoVazios,
  montarFiguraMunicipio,
  montarLinhasTooltipMunicipio,
  montarResumoMunicipio,
  prepararSerieMunicipio,
  resumoFiltrosMunicipio,
} from './visao-municipio.mapper';

const ponto = (ano: number, parcial: Partial<PontoMunicipioModel> = {}): PontoMunicipioModel => ({
  ano,
  situacao: 'com_dados',
  cobertura_media_percentual: 75.56,
  quantidade_escolas: 120,
  quantidade_escolas_com_informacao: 110,
  quantidade_escolas_sem_dados: 10,
  indicadores: {},
  ...parcial,
});
const SEM_DADOS = {
  situacao: 'sem_dados',
  cobertura_media_percentual: null,
  quantidade_escolas_com_informacao: 0,
} as const;
const ZERO = {
  situacao: 'denominador_zero',
  cobertura_media_percentual: null,
  quantidade_escolas: 0,
  quantidade_escolas_com_informacao: 0,
  quantidade_escolas_sem_dados: 0,
} as const;

describe('visão Município (FE16)', () => {
  it('preenche os anos do intervalo que a API não devolveu com "Sem dados", em ordem', () => {
    const pontos = prepararSerieMunicipio([ponto(2024), ponto(2022)], [2022, 2025]);
    expect(pontos.map((p) => [p.ano, p.situacao])).toEqual([
      [2022, 'com_dados'],
      [2023, 'sem_dados'],
      [2024, 'com_dados'],
      [2025, 'sem_dados'],
    ]);
    expect(pontos[1].cobertura_media_percentual).toBeNull();
  });

  it('classifica a série: com dados (mesmo parcial), sem dados ou denominador zero', () => {
    expect(classificarSerieMunicipio([ponto(2022), ponto(2023, SEM_DADOS)])).toBe('com_dados');
    expect(classificarSerieMunicipio([ponto(2022, SEM_DADOS), ponto(2023, ZERO)])).toBe(
      'sem_dados',
    );
    expect(classificarSerieMunicipio([ponto(2022, ZERO), ponto(2023, ZERO)])).toBe(
      'denominador_zero',
    );
  });

  it('tooltip no formato da REQ07, com "Não calculada" no denominador zero', () => {
    expect(montarLinhasTooltipMunicipio(ponto(2024))).toEqual([
      '<b>Ano: 2024</b>',
      'Cobertura do município selecionado: 75,56%',
    ]);
    expect(montarLinhasTooltipMunicipio(ponto(2024, ZERO))[1]).toBe(
      'Cobertura do município selecionado: Não calculada',
    );
    expect(montarLinhasTooltipMunicipio(ponto(2024, SEM_DADOS))[1]).toBe(
      'Cobertura do município selecionado: Sem dados',
    );
  });

  it('desenha uma linha azul "Cobertura média da rede municipal" sem ligar lacunas', () => {
    const figura = montarFiguraMunicipio([ponto(2022), ponto(2023, SEM_DADOS), ponto(2024)]);
    expect(figura.data).toHaveLength(1);
    expect(figura.data[0]['name']).toBe('Cobertura média da rede municipal');
    expect(figura.data[0]['y']).toEqual([75.56, null, 75.56]);
    expect(figura.data[0]['connectgaps']).toBe(false);
    expect(figura.layout['showlegend']).toBe(true);
    expect(figura.layout['yaxis'].range).toEqual([0, 100]);
  });

  it('cartões de resumo com dados (REQ07 §3.3)', () => {
    expect(montarResumoMunicipio(ponto(2025), 'Belém', 17)).toEqual([
      expect.objectContaining({
        titulo: 'Escolas elegíveis',
        valor: '120',
        descricao: 'Rede de Belém',
      }),
      expect.objectContaining({
        titulo: 'Escolas com informação',
        valor: '110',
        descricao: '10 escolas sem dados',
      }),
      expect.objectContaining({
        titulo: 'Cobertura da rede',
        valor: '75,56%',
        descricao: 'Média dos índices escolares',
      }),
      expect.objectContaining({
        titulo: 'Indicadores selecionados',
        valor: '17',
        descricao: 'mesmo conjunto em todos os anos',
      }),
    ]);
  });

  it('cartões sem dados e com denominador zero (nunca 0% de cobertura)', () => {
    const valores = (p: PontoMunicipioModel | null) =>
      montarResumoMunicipio(p, 'Belém', 5).map((c) => c.valor);
    expect(valores(null)).toEqual(['Sem dados', 'Sem dados', 'Sem dados', '5']);
    expect(valores(ponto(2025, SEM_DADOS))).toEqual(['Sem dados', 'Sem dados', 'Sem dados', '5']);
    expect(valores(ponto(2025, ZERO))).toEqual(['0', '0', 'Não calculada', '5']);
  });

  it('cartões por ano nos três estados e na tela padrão (REQ07 §3.6)', () => {
    expect(montarCartaoAno(ponto(2022))).toEqual({
      ano: 2022,
      valor: '75,56%',
      rotulo: 'Cobertura da rede',
      linhas: ['120 escolas elegíveis', '110 com informação válida', '10 sem dados'],
      variante: 'com_dados',
    });
    expect(montarCartaoAno(ponto(2023, ZERO))).toEqual({
      ano: 2023,
      valor: 'Não calculada',
      rotulo: 'Cobertura da rede',
      linhas: ['0 escolas elegíveis', '0 com informação válida', 'Denominador zero'],
      variante: 'denominador_zero',
    });
    expect(montarCartaoAno(ponto(2024, SEM_DADOS))).toEqual({
      ano: 2024,
      valor: 'Sem dados',
      rotulo: 'Cobertura indisponível',
      linhas: ['Informação de cobertura indisponível', 'Sem dados para calcular o percentual'],
      variante: 'sem_dados',
    });
    expect(montarCartoesAnoVazios([2022, 2023])).toEqual([
      {
        ano: 2022,
        valor: 'Sem dados',
        rotulo: null,
        linhas: ['Selecione um município'],
        variante: 'inicial',
      },
      {
        ano: 2023,
        valor: 'Sem dados',
        rotulo: null,
        linhas: ['Selecione um município'],
        variante: 'inicial',
      },
    ]);
  });

  it('resumo do cartão recolhido no celular (REQ07 §3.2)', () => {
    expect(resumoFiltrosMunicipio(FILTROS_MUNICIPIO_PADRAO, null, [2022, 2025])).toBe(
      'Todos os municípios · Todas as dependências administrativas 2022–2025 · 17 de 17 indicadores',
    );
    expect(
      resumoFiltrosMunicipio(
        { municipio: 1501402, rede: 'Municipal', anos: [2023, 2024], indicadores: ['in_banheiro'] },
        'Belém',
        [2022, 2025],
      ),
    ).toBe('Belém · Municipal 2023–2024 · 1 de 17 indicadores');
  });
});
