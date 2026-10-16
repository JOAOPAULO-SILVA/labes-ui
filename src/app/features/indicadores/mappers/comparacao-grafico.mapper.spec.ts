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
  selecionarPontoResumo,
} from './comparacao-grafico.mapper';
import {
  mapComparacaoEscolaMunicipioResponseToModel,
  prepararSerieGraficoComparacao,
} from './infraestrutura.mapper';

const modelo = mapComparacaoEscolaMunicipioResponseToModel(
  comparacaoMock as ComparacaoInfraestruturaResponse,
);
const serie = prepararSerieGraficoComparacao(modelo.serie, modelo.metodologia.anos);
const texto = (linhas: string[]) => linhas.join('\n').replace(/<\/?b>/g, '');

describe('montarFiguraComparacao', () => {
  const figura = montarFiguraComparacao(serie);

  it('tem duas linhas identificadas com os nomes do protótipo', () => {
    expect(figura.data.map((t) => t['name'])).toEqual([
      'Escola selecionada',
      'Média das demais escolas do município',
    ]);
  });

  it('não conecta valores separados por lacunas', () => {
    for (const trace of figura.data) {
      expect(trace['connectgaps']).toBe(false);
    }
    expect(figura.data[0]['y']).toEqual([76.47, 70.0, null, 70.59]);
    expect(figura.data[1]['y']).toEqual([64.71, 62.5, null, null]);
  });

  it('rotula os pontos e deixa as lacunas sem rótulo', () => {
    expect(figura.data[0]['text']).toEqual(['76,47%', '70%', '', '70,59%']);
  });

  it('usa eixo de 0% a 100% e anos crescentes', () => {
    expect(figura.layout['yaxis'].range).toEqual([0, 100]);
    expect(figura.layout['yaxis'].ticksuffix).toBe('%');
    expect(figura.layout['yaxis'].title.text).toBe('Percentual de recursos');
    expect(figura.data[0]['x']).toEqual([2022, 2023, 2024, 2025]);
    expect(figura.layout['xaxis'].tickvals).toEqual([2022, 2023, 2024, 2025]);
  });
});

describe('tooltip', () => {
  it('mostra ano, escola, demais escolas e diferença como no protótipo', () => {
    expect(texto(montarLinhasTooltip(serie.pontos[0]))).toBe(
      [
        'Ano 2022',
        'Escola selecionada: 76,47% (17 indicadores válidos)',
        'Demais escolas do município: 64,71% (85 pares)',
        'Diferença: +11,76 p.p.',
      ].join('\n'),
    );
  });

  it('mostra "Sem dados" em vez de zero', () => {
    const t = texto(montarLinhasTooltip(serie.pontos[2]));
    expect(t).toContain('Escola selecionada: Sem dados');
    expect(t).toContain('Diferença: Sem dados');
    expect(t).not.toContain('0%');
  });
});

describe('montarResumoComparacao', () => {
  it('usa o último ano disponível da escola', () => {
    expect(selecionarPontoResumo(serie)?.ano).toBe(2025);
    const semUltimoAno = prepararSerieGraficoComparacao(
      modelo.serie.map((p) => (p.ano === 2025 ? { ...p, indice_escola_percentual: null } : p)),
    );
    expect(selecionarPontoResumo(semUltimoAno)?.ano).toBe(2023);
  });

  it('monta os quatro cartões do protótipo', () => {
    const resumo = montarResumoComparacao(serie);
    expect(resumo.map((i) => [i.titulo, i.valor, i.descricao])).toEqual([
      ['Escola selecionada', '70,59%', '12 de 17 recursos disponíveis'],
      ['Demais escolas do município', 'Sem dados', '0 escolas na referência'],
      ['Diferença', 'Sem dados', undefined],
      ['Indicadores válidos', '17', 'de 17 indicadores da metodologia'],
    ]);
    expect(resumo[2].tom).toBe('neutro');
  });

  it('marca a diferença negativa', () => {
    const negativa = prepararSerieGraficoComparacao([
      { ...modelo.serie[0], diferenca_pontos_percentuais: -32.21 },
    ]);
    expect(montarResumoComparacao(negativa)[2]).toMatchObject({
      valor: '-32,21 p.p.',
      tom: 'negativo',
    });
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
    expect(formatarPercentual(null)).toBe('Sem dados');
    expect(formatarPontosPercentuais(-3.2)).toBe('-3,2 p.p.');
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
