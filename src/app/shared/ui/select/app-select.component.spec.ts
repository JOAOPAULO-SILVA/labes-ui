import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { AppSelectComponent } from './app-select.component';
import { AppSelectOption } from './app-select.types';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AppSelectComponent],
  template: `
    <app-select
      label="Status"
      placeholder="Selecione"
      [options]="options"
      [formControl]="control"
    />
  `,
})
class HostComponent {
  control = new FormControl('ativo');
  options: AppSelectOption<string>[] = [
    { label: 'Ativo', value: 'ativo' },
    { label: 'Inativo', value: 'inativo' },
  ];
}

describe('AppSelectComponent', () => {
  it('mantém options como tipo próprio do Design System', async () => {
    const fixture = await createHost();
    const select = fixture.debugElement.query(By.directive(AppSelectComponent))
      .componentInstance as AppSelectComponent;

    expect(select.options().map((option) => option.label)).toEqual(['Ativo', 'Inativo']);
  });

  it('não tem busca nem rolagem virtual por padrão', async () => {
    const fixture = await createHost();
    const select = fixture.debugElement.query(By.directive(AppSelectComponent))
      .componentInstance as AppSelectComponent;

    expect(select.searchable()).toBe(false);
    expect(select.useVirtualScroll()).toBe(false);
  });

  it('usa rolagem virtual em listas longas e ajusta a altura com descrição', async () => {
    const fixture = await createHost();
    const debug = fixture.debugElement.query(By.directive(AppSelectComponent));
    const select = debug.componentInstance as AppSelectComponent;
    fixture.componentInstance.options = Array.from({ length: 150 }, (_, i) => ({
      label: 'Escola ' + i,
      value: String(i),
      description: 'Belém',
    }));
    fixture.detectChanges();

    expect(select.useVirtualScroll()).toBe(true);
    expect(select.itemHeight()).toBe(56);
  });
});

async function createHost(): Promise<ComponentFixture<HostComponent>> {
  await TestBed.configureTestingModule({
    imports: [HostComponent],
  }).compileComponents();

  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AppSelectComponent],
  template: `<app-select
    label="Escola"
    [options]="options"
    [showClear]="true"
    [formControl]="control"
  />`,
})
class HostComLimparComponent {
  control = new FormControl<string | null>('ativo');
  options: AppSelectOption<string>[] = [{ label: 'Ativo', value: 'ativo' }];
}

describe('AppSelectComponent com showClear', () => {
  it('oferece um botão rotulado que limpa o valor', async () => {
    await TestBed.configureTestingModule({ imports: [HostComLimparComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComLimparComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const botao = fixture.nativeElement.querySelector(
      'button[aria-label="Limpar seleção"]',
    ) as HTMLButtonElement;
    expect(botao).not.toBeNull();

    botao.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBeNull();
  });
});
