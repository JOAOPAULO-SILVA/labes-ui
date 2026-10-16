import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EscolaBuscaModel } from '../../models/infraestrutura.models';
import { EscolaBuscaComponent } from './escola-busca.component';

const ESCOLAS: EscolaBuscaModel[] = [
  {
    co_entidade: 15012345,
    nome: 'EMEF São José',
    municipio: 'Belém',
    dependencia: 'Municipal',
    localizacao: 'Urbana',
  },
  {
    co_entidade: 15054321,
    nome: 'Escola Estadual Dom Pedro I',
    municipio: 'Ananindeua',
    dependencia: 'Estadual',
    localizacao: 'Urbana',
  },
];

describe('EscolaBuscaComponent', () => {
  let fixture: ComponentFixture<EscolaBuscaComponent>;
  let el: HTMLElement;

  const digitar = (texto: string) => {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EscolaBuscaComponent] });
    fixture = TestBed.createComponent(EscolaBuscaComponent);
    fixture.componentRef.setInput('escolas', ESCOLAS);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('não mostra resultados antes de digitar', () => {
    expect(el.querySelectorAll('.search-result-item').length).toBe(0);
  });

  it('mostra nome e município, ignorando acentos', () => {
    digitar('sao jose');
    const itens = el.querySelectorAll('.search-result-item');
    expect(itens.length).toBe(1);
    expect(itens[0].querySelector('.escola-nome')?.textContent).toContain('EMEF São José');
    expect(itens[0].querySelector('.escola-municipio')?.textContent).toContain('Belém');
  });

  it('busca pelo código INEP', () => {
    digitar('15054');
    expect(el.querySelector('.escola-nome')?.textContent).toContain('Dom Pedro I');
  });

  it('emite uma única escola ao selecionar e limpa o termo', () => {
    const emitidas: EscolaBuscaModel[] = [];
    fixture.componentInstance.selecionar.subscribe((e) => emitidas.push(e));

    digitar('dom pedro');
    (el.querySelector('.btn-selecionar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(emitidas.map((e) => e.co_entidade)).toEqual([15054321]);
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('mostra a escola selecionada e emite limpar', () => {
    let limpou = false;
    fixture.componentInstance.limpar.subscribe(() => (limpou = true));
    fixture.componentRef.setInput('selecionada', ESCOLAS[0]);
    fixture.detectChanges();

    expect(el.querySelector('.escola-selecionada')?.textContent).toContain('INEP 15012345');
    (el.querySelector('.escola-selecionada .btn-reset') as HTMLButtonElement).click();
    expect(limpou).toBe(true);
  });

  it('avisa quando há mais resultados do que os exibidos', () => {
    const muitas = Array.from({ length: 20 }, (_, i) => ({
      ...ESCOLAS[0],
      co_entidade: 15000000 + i,
      nome: `Escola ${i}`,
    }));
    fixture.componentRef.setInput('escolas', muitas);
    digitar('escola');

    expect(el.querySelectorAll('.search-result-item').length).toBe(8);
    const status = el.querySelector('#escola-busca-status') as HTMLElement;
    expect(status.textContent).toContain('Mostrando 8 de 20 escolas');
    expect(status.classList).not.toContain('sr-only');
  });

  it('anuncia a quantidade de resultados sem semântica de combobox', () => {
    digitar('dom pedro');
    const input = el.querySelector('input') as HTMLInputElement;
    const status = el.querySelector('#escola-busca-status') as HTMLElement;

    expect(input.getAttribute('role')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('escola-busca-status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('1 escola encontrada.');
    expect(el.querySelector('[role="listbox"], [role="option"]')).toBeNull();
  });

  it('avisa quando nenhuma escola corresponde', () => {
    digitar('inexistente');
    expect(el.querySelector('.empty-results')?.textContent).toContain('Nenhuma escola encontrada');
  });
});
