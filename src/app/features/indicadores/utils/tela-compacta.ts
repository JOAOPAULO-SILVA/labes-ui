import { DestroyRef, Signal, inject, signal } from '@angular/core';

/** Largura até a qual a análise temporal usa o layout de celular (REQ07: filtros em gaveta). */
export const MEDIA_TELA_COMPACTA = '(max-width: 768px)';

/**
 * Sinal que acompanha se a tela é de celular. Precisa ser chamado num contexto de injeção.
 * Sem `matchMedia` (ex.: testes), assume tela larga.
 */
export function injectTelaCompacta(): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  const consulta =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MEDIA_TELA_COMPACTA)
      : null;
  const compacta = signal(consulta?.matches ?? false);
  if (consulta) {
    const atualizar = (evento: MediaQueryListEvent) => compacta.set(evento.matches);
    consulta.addEventListener('change', atualizar);
    destroyRef.onDestroy(() => consulta.removeEventListener('change', atualizar));
  }
  return compacta.asReadonly();
}
