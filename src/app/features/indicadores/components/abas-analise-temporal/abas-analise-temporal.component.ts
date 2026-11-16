import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Abas da análise temporal de infraestrutura (REQ07 §2.1): "Análise por Escola" (Frente 1)
 * e "Análise por Município" (Frente 2). Cada aba é uma rota; não há seleção mista.
 */
@Component({
  selector: 'app-abas-analise-temporal',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="abas" aria-label="Visões da análise temporal">
      <a
        class="abas__aba"
        routerLink="/indicadores/infraestrutura/analise-temporal"
        routerLinkActive="is-ativa"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
      >
        <i class="pi pi-building" aria-hidden="true"></i>
        Análise por Escola
      </a>
      <a
        class="abas__aba"
        routerLink="/indicadores/infraestrutura/analise-temporal/municipio"
        routerLinkActive="is-ativa"
        ariaCurrentWhenActive="page"
      >
        <i class="pi pi-map-marker" aria-hidden="true"></i>
        Análise por Município
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    .abas {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid #dce5ef;
      overflow-x: auto;
    }
    .abas__aba {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 3px solid transparent;
      color: var(--sie-color-muted);
      font-size: 0.92rem;
      font-weight: 800;
      white-space: nowrap;
      text-decoration: none;
    }
    .abas__aba:hover {
      color: var(--sie-color-primary);
    }
    .abas__aba:focus-visible {
      outline: 2px solid var(--sie-color-primary);
      outline-offset: -2px;
    }
    .abas__aba.is-ativa {
      border-bottom-color: var(--sie-color-primary);
      color: var(--sie-color-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbasAnaliseTemporalComponent {}
