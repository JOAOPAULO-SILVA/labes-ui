import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { AppSelectOption, AppSelectSize, AppSelectStatus } from './app-select.types';

type PrimeSelectSize = 'small' | 'large';

let nextSelectId = 0;

/** A partir deste tamanho, a lista renderiza só os itens visíveis. */
const VIRTUAL_SCROLL_MIN_OPTIONS = 100;

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [FormsModule, SelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true,
    },
  ],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .app-select__clear {
      display: inline-grid;
      width: 24px;
      height: 24px;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .app-select__clear:focus-visible {
      outline: 2px solid var(--sie-color-primary);
      outline-offset: 1px;
    }
    .app-select__option {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .app-select__option-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .app-select__option-description {
      color: var(--sie-color-muted);
      font-size: 0.8rem;
    }
  `,
  template: `
    <label class="app-field" [for]="selectId()">
      @if (label()) {
        <span class="app-field__label">{{ label() }}</span>
      }

      <p-select
        [inputId]="selectId()"
        [options]="primeOptions()"
        optionLabel="label"
        optionValue="value"
        optionDisabled="disabled"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [invalid]="isInvalid()"
        [size]="primeSize()"
        [loading]="loading()"
        [showClear]="showClear()"
        [filter]="searchable()"
        filterBy="label,description"
        [filterPlaceholder]="searchPlaceholder()"
        [emptyFilterMessage]="emptyMessage()"
        [virtualScroll]="useVirtualScroll()"
        [virtualScrollItemSize]="itemHeight()"
        [fluid]="true"
        appendTo="body"
        [ngModel]="value()"
        (ngModelChange)="onValueChange($event)"
        (onBlur)="onTouched()"
      >
        <ng-template #clearicon>
          <button type="button" class="app-select__clear" [attr.aria-label]="clearLabel()">
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </ng-template>
        <ng-template #item let-option>
          <span class="app-select__option">
            <span class="app-select__option-label">{{ option.label }}</span>
            @if (option.description) {
              <small class="app-select__option-description">{{ option.description }}</small>
            }
          </span>
        </ng-template>
      </p-select>

      @if (error()) {
        <span class="app-field__error">{{ error() }}</span>
      } @else if (hint()) {
        <span class="app-field__hint">{{ hint() }}</span>
      }
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSelectComponent implements ControlValueAccessor {
  readonly id = input<string | null>(null);
  readonly label = input('');
  readonly placeholder = input('');
  readonly options = input<readonly AppSelectOption[]>([]);
  readonly size = input<AppSelectSize>('md');
  readonly status = input<AppSelectStatus>('default');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly showClear = input(false);
  /** Rótulo acessível do botão de limpar (`showClear`). */
  readonly clearLabel = input('Limpar seleção');
  /** Campo de busca na lista; listas longas passam a usar rolagem virtual. */
  readonly searchable = input(false);
  readonly searchPlaceholder = input('Buscar');
  readonly emptyMessage = input('Nenhum resultado encontrado');
  readonly hint = input('');
  readonly error = input('');

  readonly value = signal<unknown>(null);
  private readonly generatedId = `app-select-${++nextSelectId}`;
  private readonly disabledByControl = signal(false);

  readonly selectId = computed(() => this.id() ?? this.generatedId);
  readonly primeOptions = computed(() => [...this.options()]);
  readonly hasDescriptions = computed(() => this.options().some((o) => Boolean(o.description)));
  readonly useVirtualScroll = computed(() => this.options().length > VIRTUAL_SCROLL_MIN_OPTIONS);
  readonly itemHeight = computed(() => (this.hasDescriptions() ? 56 : 38));
  readonly isDisabled = computed(() => this.disabled() || this.disabledByControl());
  readonly isInvalid = computed(() => this.status() === 'invalid' || Boolean(this.error()));
  readonly primeSize = computed<PrimeSelectSize | undefined>(() => {
    const size = this.size();
    return size === 'md' ? undefined : size === 'sm' ? 'small' : 'large';
  });

  private onChange: (value: unknown) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: unknown): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByControl.set(isDisabled);
  }

  onValueChange(value: unknown): void {
    this.value.set(value);
    this.onChange(value);
  }
}
