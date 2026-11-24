import { describe, expect, it } from 'vitest';

import { ajustarIntervalo } from './app-range-slider.component';

describe('ajustarIntervalo (mínimo de 2 anos)', () => {
  const ajustar = (anterior: [number, number], novo: [number, number]) =>
    ajustarIntervalo(anterior, novo, 2022, 2025, 2);

  it('aceita intervalos de 2 anos ou mais sem mudar nada', () => {
    expect(ajustar([2022, 2025], [2023, 2024])).toEqual([2023, 2024]);
    expect(ajustar([2022, 2025], [2022, 2025])).toEqual([2022, 2025]);
  });

  it('ao levar o fim até o início, o fim fica e o início recua (REQ07: só 2024 vira 2023–2024)', () => {
    expect(ajustar([2024, 2025], [2024, 2024])).toEqual([2023, 2024]);
  });

  it('ao levar o início até o fim, empurra o fim (ex.: só 2024 vira 2024–2025)', () => {
    expect(ajustar([2022, 2024], [2024, 2024])).toEqual([2024, 2025]);
  });

  it('sem espaço para empurrar no limite superior, recua a alça movida', () => {
    expect(ajustar([2022, 2025], [2025, 2025])).toEqual([2024, 2025]);
  });

  it('sem espaço no limite inferior, avança o fim', () => {
    expect(ajustar([2022, 2025], [2022, 2022])).toEqual([2022, 2023]);
  });

  it('respeita os limites mínimo e máximo', () => {
    expect(ajustar([2022, 2025], [2020, 2030])).toEqual([2022, 2025]);
  });
});
