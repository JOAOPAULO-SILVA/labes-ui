import { describe, expect, it } from 'vitest';

import { EscolaBuscaModel } from '../../../models/infraestrutura.models';
import {
  ANOS_PADRAO,
  FILTROS_ESCOLA_PADRAO,
  anosDisponiveisDoCatalogo,
  intervaloAnos,
  normalizarFiltrosEscola,
  resumoFiltrosEscola,
} from './filtros-escola';

const escola = (co: number, municipio: string, dependencia: string): EscolaBuscaModel => ({
  co_entidade: co,
  nome: `Escola ${co}`,
  municipio,
  codigoMunicipio: null,
  dependencia,
  localizacao: null,
});

describe('filtros da aba Escola', () => {
  it('usa os anos do catálogo em ordem e cai no período padrão sem resposta', () => {
    expect(anosDisponiveisDoCatalogo([2024, 2022, 2023, 2022], ANOS_PADRAO)).toEqual([
      2022, 2023, 2024,
    ]);
    expect(anosDisponiveisDoCatalogo([], ANOS_PADRAO)).toEqual([2022, 2023, 2024, 2025]);
    expect(intervaloAnos([2022, 2023, 2024, 2025, 2026])).toEqual([2022, 2026]);
  });

  it('desmarca a escola que deixa de passar no município ou na dependência', () => {
    const escolas = [escola(1, 'Belém', 'Municipal'), escola(2, 'Belém', 'Estadual')];
    const comEscola = { ...FILTROS_ESCOLA_PADRAO, escola: 1 };
    expect(normalizarFiltrosEscola({ ...comEscola, municipio: 'Belém' }, escolas).escola).toBe(1);
    expect(
      normalizarFiltrosEscola({ ...comEscola, dependenciaEscola: 'Estadual' }, escolas).escola,
    ).toBeNull();
    expect(normalizarFiltrosEscola({ ...comEscola, municipio: 'Ananindeua' }, escolas).escola).toBe(
      null,
    );
  });

  it('monta o resumo do cartão recolhido no celular (REQ07 §2.2)', () => {
    expect(resumoFiltrosEscola(FILTROS_ESCOLA_PADRAO, null, [2022, 2025])).toBe(
      'Selecione uma escola · Todos os municípios 2022–2025 · Todas as dependências administrativas',
    );
    expect(
      resumoFiltrosEscola(
        {
          ...FILTROS_ESCOLA_PADRAO,
          municipio: 'Belém',
          anos: [2023, 2024],
          redeMunicipio: 'Municipal',
        },
        'EMEF Exemplo',
        [2022, 2025],
      ),
    ).toBe('EMEF Exemplo · Belém 2023–2024 · Municipal');
  });
});
