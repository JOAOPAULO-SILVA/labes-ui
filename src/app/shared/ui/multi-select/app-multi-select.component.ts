import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';

import { AppSelectOption } from '../select/app-select.types';

let nextMultiSelectId = 0;

/**
 * Escolha de várias opções de uma lista. O campo fechado mostra um resumo
 * (`resumo`, ex.: "17 de 17 selecionados") em vez dos nomes escolhidos.
 */
@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [FormsModule, MultiSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppMultiSelectComponent),
      multi: true,
    },
  ],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .app-multi {
      display: grid;
      gap: 6px;
    }
    .app-multi__label {
      color: #17213d;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .app-multi__hint {
      color: var(--sie-color-muted);
      font-size: 0.78rem;
    }
    .app-multi__hint--erro {
      color: #b42318;
      font-weight: 700;
    }
  `,
  template: `
    <div class="app-multi">
      @if (label()) {
        <label class="app-multi__label" [for]="selectId">{{ label() }}</label>
      }
      <p-multiselect
        [inputId]="selectId"
        [options]="primeOptions()"
        optionLabel="label"
        optionValue="value"
        [placeholder]="resumo()"
        [selectedItemsLabel]="resumo()"
        [maxSelectedLabels]="0"
        [filter]="searchable()"
        [filterPlaceHolder]="searchPlaceholder()"
        [showToggleAll]="true"
        [disabled]="isDisabled()"
        [invalid]="!!error()"
        [fluid]="true"
        appendTo="body"
        [ngModel]="valor()"
        (ngModelChange)="onValueChange($event)"
        (onBlur)="onTouched()"
      />
      @if (error()) {
        <span class="app-multi__hint app-multi__hint--erro" role="alert">{{ error() }}</span>
      } @else if (hint()) {
        <span class="app-multi__hint">{{ hint() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppMultiSelectComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly options = input<readonly AppSelectOption[]>([]);
  /** Texto do campo fechado; também usado como placeholder quando nada está marcado. */
  readonly resumo = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly searchable = input(false);
  readonly searchPlaceholder = input('Buscar');
  readonly disabled = input(false);

  protected readonly selectId = `app-multi-select-${++nextMultiSelectId}`;
  protected readonly valor = signal<unknown[]>([]);
  private readonly disabledByControl = signal(false);

  protected readonly primeOptions = computed(() => [...this.options()]);
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByControl());

  private onChange: (value: unknown[]) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: unknown[] | null): void {
    this.valor.set(value ? [...value] : []);
  }

  registerOnChange(fn: (value: unknown[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByControl.set(isDisabled);
  }

  protected onValueChange(value: unknown[] | null): void {
    const lista = value ?? [];
    this.valor.set(lista);
    this.onChange(lista);
  }
}
