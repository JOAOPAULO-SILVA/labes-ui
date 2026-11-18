import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { AppMultiSelectComponent } from './app-multi-select.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AppMultiSelectComponent],
  template: `<app-multi-select
    label="Indicadores"
    [options]="options"
    [resumo]="control.value.length + ' de 2 selecionados'"
    [formControl]="control"
  />`,
})
class HostComponent {
  control = new FormControl<string[]>(['a', 'b'], { nonNullable: true });
  options = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ];
}

describe('AppMultiSelectComponent', () => {
  it('recebe o valor do formulário e devolve as mudanças', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const multi = fixture.debugElement.query(By.directive(AppMultiSelectComponent))
      .componentInstance as unknown as {
      valor: () => string[];
      onValueChange: (v: string[] | null) => void;
    };

    expect(multi.valor()).toEqual(['a', 'b']);
    multi.onValueChange(['a']);
    expect(fixture.componentInstance.control.value).toEqual(['a']);
    multi.onValueChange(null);
    expect(fixture.componentInstance.control.value).toEqual([]);
  });

  it('mostra o resumo no campo fechado', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 de 2 selecionados');
  });
});
