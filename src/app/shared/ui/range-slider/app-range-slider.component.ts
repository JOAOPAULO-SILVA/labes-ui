import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SliderModule } from 'primeng/slider';

import { AppRangeValue } from './app-range-slider.types';

let nextRangeId = 0;

/**
 * Mantém o intervalo com pelo menos `minimoInclusivo` valores (ex.: 2 anos = 2023–2024).
 * A alça que o usuário moveu fica onde ele a soltou; a outra é empurrada. Sem espaço
 * para empurrar (encostada no limite), a alça movida é que recua.
 */
export function ajustarIntervalo(
  anterior: AppRangeValue,
  novo: AppRangeValue,
  min: number,
  max: number,
  minimoInclusivo: number,
): AppRangeValue {
  const distancia = Math.max(minimoInclusivo - 1, 0);
  let [inicio, fim] = [Math.min(novo[0], novo[1]), Math.max(novo[0], novo[1])];
  inicio = Math.max(min, inicio);
  fim = Math.min(max, fim);
  if (fim - inicio >= distancia) return [inicio, fim];

  const moveuInicio = inicio !== anterior[0];
  if (moveuInicio) {
    fim = Math.min(max, inicio + distancia);
    inicio = fim - distancia;
  } else {
    inicio = Math.max(min, fim - distancia);
    fim = inicio + distancia;
  }
  return [Math.max(min, inicio), Math.min(max, fim)];
}

/** Seleção de um intervalo contínuo (ex.: anos), com tamanho mínimo garantido. */
@Component({
  selector: 'app-range-slider',
  standalone: true,
  imports: [FormsModule, SliderModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppRangeSliderComponent),
      multi: true,
    },
  ],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .app-range {
      display: grid;
      gap: 10px;
    }
    .app-range__topo {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .app-range__label {
      color: #17213d;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .app-range__valor {
      color: var(--sie-color-deep);
      font-size: 0.85rem;
      font-weight: 800;
    }
    .app-range__trilho {
      padding: 6px 8px;
    }
    .app-range__hint {
      color: var(--sie-color-muted);
      font-size: 0.78rem;
    }
  `,
  template: `
    <div class="app-range" role="group" [attr.aria-labelledby]="rangeId + '-label'">
      <div class="app-range__topo">
        <span class="app-range__label" [id]="rangeId + '-label'">{{ label() }}</span>
        <span class="app-range__valor" aria-live="polite">{{ valorTexto() }}</span>
      </div>
      <div class="app-range__trilho">
        <p-slider
          [range]="true"
          [min]="min()"
          [max]="max()"
          [step]="1"
          [disabled]="isDisabled()"
          [ariaLabel]="label()"
          [ngModel]="valor()"
          (ngModelChange)="onSlide($event)"
          (onSlideEnd)="onTouched()"
        />
      </div>
      @if (hint()) {
        <span class="app-range__hint">{{ hint() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRangeSliderComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly hint = input('');
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  /** Quantidade mínima de valores inclusivos no intervalo (2 = dois anos). */
  readonly minimoInclusivo = input(1);
  readonly disabled = input(false);

  protected readonly rangeId = `app-range-${++nextRangeId}`;
  protected readonly valor = signal<AppRangeValue>([0, 0]);
  private readonly disabledByControl = signal(false);

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByControl());
  protected readonly valorTexto = computed(() => {
    const [inicio, fim] = this.valor();
    return inicio === fim ? String(inicio) : `${inicio}–${fim}`;
  });

  private onChange: (value: AppRangeValue) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: AppRangeValue | null): void {
    if (value) this.valor.set([value[0], value[1]]);
  }

  registerOnChange(fn: (value: AppRangeValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByControl.set(isDisabled);
  }

  protected onSlide(novo: AppRangeValue): void {
    const ajustado = ajustarIntervalo(
      this.valor(),
      novo,
      this.min(),
      this.max(),
      this.minimoInclusivo(),
    );
    this.valor.set(ajustado);
    this.onChange(ajustado);
  }
}
