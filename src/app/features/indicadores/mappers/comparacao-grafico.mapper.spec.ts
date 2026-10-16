import { describe, expect, it } from 'vitest';

import { ComparacaoInfraestruturaResponse } from '../../../core/api/models/comparacao-infraestrutura-response';
import comparacaoMock from '../mocks/comparacao-escola-municipio.json';
import {
  classificarSerieComparacao,
  formatarPercentual,
  formatarPontosPercentuais,
  montarFiguraComparacao,
  montarLinhasTooltip,
  montarResumoComparacao,
} from './comparacao-grafico.mapper';
import {
  mapComparacaoEscolaMunicipioResponseToModel,
  prepararSerieGraficoComparacao,
} from './infraestrutura.mapper';

const modelo = mapComparacaoEscolaMunicipioResponseToModel(
  comparacaoMock as ComparacaoInfraestruturaResponse,
);
const serie = prepararSerieGraficoComparacao(modelo.serie, modelo.metodologia.anos);

describe('montarFiguraComparacao', () => {
  const figura = montarFiguraComparacao(serie);

  it('tem duas linhas identificadas', () => {
    expect(figura.data.map((t) => t['name'])).toEqual(['Escola', 'Média municipal']);
  });

  it('não conecta valores separados por lacunas', () => {
    for (const trace of figura.data) {
      expect(trace['connectgaps']).toBe(false);
    }
    expect(figura.data[0]['y']).toEqual([76.47, 70.0, null, 70.59]);
    expect(figura.data[1]['y']).toEqual([64.71, 62.5, null, null]);
  });

  it('usa eixo de 0% a 100% e anos crescentes', () => {
    expect(figura.layout['yaxis'].range).toEqual([0, 100]);
    expect(figura.layout['yaxis'].ticksuffix).toBe('%');
    expect(figura.data[0]['x']).toEqual([2022, 2023, 2024, 2025]);
    expect(figura.layout['xaxis'].tickvals).toEqual([2022, 2023, 2024, 2025]);
  });
});

describe('tooltip', () => {
  it('mostra ano, índices, diferença, pares e indicadores', () => {
    const texto = montarLinhasTooltip(serie.pontos[0]).join('\n');
    expect(texto).toContain('Ano 2022');
    expect(texto).toContain('Índice da escola: 76,47%');
    expect(texto).toContain('Média municipal: 64,71%');
    expect(texto).toContain('Diferença: +11,76 p.p.');
    expect(texto).toContain('Pares válidos: 85 de 94');
    expect(texto).toContain('Indicadores válidos: 17 de 17');
  });

  it('explica a ausência de dado', () => {
    const texto = montarLinhasTooltip(serie.pontos[2]).join('\n');
    expect(texto).toContain('Índice da escola: —');
    expect(texto).toContain('A escola não tem dados neste ano.');
  });
});

describe('montarResumoComparacao', () => {
  it('usa o último ano da série', () => {
    const resumo = montarResumoComparacao(serie);
    const porTitulo = Object.fromEntries(resumo.map((i) => [i.titulo, i.valor]));
    expect(porTitulo).toEqual({
      Ano: '2025',
      'Índice da escola': '70,59%',
      'Média municipal': '—',
      Diferença: '—',
      'Pares válidos': '0 de 96',
      'Indicadores válidos': '17 de 17',
    });
    expect(resumo[0].descricao).toContain('Nenhuma outra escola');
  });

  it('é vazio sem pontos', () => {
    expect(
      montarResumoComparacao({ anos: [], escola: [], mediaMunicipal: [], pontos: [] }),
    ).toEqual([]);
  });
});

describe('formatação', () => {
  it('formata percentuais e diferenças em pt-BR', () => {
    expect(formatarPercentual(7.5)).toBe('7,5%');
    expect(formatarPercentual(null)).toBe('—');
    expect(formatarPontosPercentuais(-3.2)).toBe('−3,2 p.p.');
    expect(formatarPontosPercentuais(0)).toBe('0 p.p.');
  });
});

describe('classificarSerieComparacao', () => {
  const base = { anos: [2022, 2023], pontos: [] };

  it('identifica série completa', () => {
    expect(classificarSerieComparacao(serie)).toBe('completa');
  });

  it('identifica ausência de histórico', () => {
    expect(
      classificarSerieComparacao({ ...base, escola: [null, null], mediaMunicipal: [50, 60] }),
    ).toBe('sem_historico');
  });

  it('identifica ausência de pares', () => {
    expect(
      classificarSerieComparacao({ ...base, escola: [40, null], mediaMunicipal: [null, null] }),
    ).toBe('sem_pares');
  });
});
