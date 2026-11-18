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
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      padding: 6px;
      border: 1px solid #dce5ef;
      border-radius: 10px;
      background: #fff;
    }
    .abas__aba {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 3px solid #dce5ef;
      border-radius: 6px 6px 0 0;
      color: var(--sie-color-muted);
      font-size: 0.92rem;
      font-weight: 800;
      text-align: center;
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
      background: #eef4ff;
      color: var(--sie-color-primary);
    }
    @media (max-width: 480px) {
      .abas__aba {
        padding: 10px 6px;
        font-size: 0.82rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbasAnaliseTemporalComponent {}
