export interface AppSelectOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
  /** Texto secundário exibido abaixo do rótulo na lista e considerado na busca. */
  description?: string;
}

export type AppSelectSize = 'sm' | 'md' | 'lg';
export type AppSelectStatus = 'default' | 'invalid';
