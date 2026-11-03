import { describe, expect, it } from 'vitest';

import {
  AlvoComparacao,
  adicionarAlvo,
  escolasComCoberturaBaixa,
  montarFiguraMultipla,
  montarSeries,
  removerAlvo,
  temAlgumDado,
  textoTooltip,
} from './comparacao-multipla.prototipo';

const ESCOLA: AlvoComparacao = {
  tipo: 'escola',
  codigo: 15012345,
  nome: 'EMEF A',
  municipio: 'Belém',
};
const BELEM: AlvoComparacao = { tipo: 'municipio', codigo: 1501402, nome: 'Belém' };
const ANANINDEUA: AlvoComparacao = { tipo: 'municipio', codigo: 1500800, nome: 'Ananindeua' };
const CASTANHAL: AlvoComparacao = { tipo: 'municipio', codigo: 1502400, nome: 'Castanhal' };

describe('seleção da comparação múltipla', () => {
  it('aceita até três itens misturando escolas e municípios, na ordem escolhida', () => {
    let alvos: AlvoComparacao[] = [];
    for (const a of [ESCOLA, BELEM, ANANINDEUA]) {
      const r = adicionarAlvo(alvos, a);
      expect(r.ok).toBe(true);
      alvos = r.alvos;
    }
    expect(alvos.map((a) => a.nome)).toEqual(['EMEF A', 'Belém', 'Ananindeua']);
  });

  it('bloqueia o quarto item e mantém a seleção', () => {
    const tres = [ESCOLA, BELEM, ANANINDEUA];
    const r = adicionarAlvo(tres, CASTANHAL);
    expect(r).toEqual({ ok: false, motivo: 'limite', alvos: tres });
  });

  it('bloqueia item duplicado, mas escola e município com mesmo código são distintos', () => {
    expect(adicionarAlvo([BELEM], BELEM)).toMatchObject({ ok: false, motivo: 'duplicado' });
    const mesmoCodigo: AlvoComparacao = { ...ESCOLA, codigo: BELEM.codigo };
    expect(adicionarAlvo([BELEM], mesmoCodigo).ok).toBe(true);
  });

  it('remove só o item escolhido', () => {
    expect(removerAlvo([ESCOLA, BELEM], 'municipio:1501402')).toEqual([ESCOLA]);
  });
});

describe('séries do protótipo', () => {
  it('escola gera sua referência automática; uma escola + dois municípios = 4 séries', () => {
    const series = montarSeries([ESCOLA, BELEM, ANANINDEUA], 'dados');
    expect(series.map((s) => s.tipo)).toEqual(['escola', 'referencia', 'municipio', 'municipio']);
    expect(series[1].legenda).toBe('Referência municipal da EMEF A');
    expect(series[1].cor).toBe(series[0].cor);
  });

  it('remover a escola remove também sua referência automática', () => {
    const series = montarSeries(removerAlvo([ESCOLA, BELEM], 'escola:15012345'), 'dados');
    expect(series.map((s) => s.tipo)).toEqual(['municipio']);
  });

  it('referência é tracejada; escola e município são contínuos com marcadores distintos', () => {
    const fig = montarFiguraMultipla(montarSeries([ESCOLA, BELEM], 'dados'));
    expect(fig.data.map((d) => d['line'].dash)).toEqual(['solid', 'dash', 'solid']);
    expect(fig.data[0]['marker'].symbol).toBe('circle');
    expect(fig.data[2]['marker'].symbol).toBe('square');
    expect(fig.data.every((d) => d['connectgaps'] === false)).toBe(true);
  });

  it('mantém nulos como lacuna em vez de zero', () => {
    const [escola] = montarSeries([ESCOLA], 'dados');
    expect(escola.pontos.find((p) => p.ano === 2024)?.valor).toBeNull();
    expect(textoTooltip(escola, escola.pontos[2])).toContain('Índice: Sem dados');
  });

  it('cenário sem dados não tem nenhum valor', () => {
    expect(temAlgumDado(montarSeries([ESCOLA, BELEM], 'sem_dados'))).toBe(false);
  });

  it('cobertura baixa marca só escolas, nunca municípios ou referências', () => {
    const series = montarSeries([{ ...ESCOLA, codigo: 15012346 }, BELEM], 'baixa_cobertura');
    expect(escolasComCoberturaBaixa(series)).toEqual([{ nome: 'EMEF A', anos: [2024, 2025] }]);
  });

  it('tooltip da referência identifica a escola vinculada e o município', () => {
    const [, ref] = montarSeries([ESCOLA], 'dados');
    const t = textoTooltip(ref, ref.pontos[0]);
    expect(t).toContain('Escola vinculada: EMEF A');
    expect(t).toContain('Município histórico: Belém');
  });
});
