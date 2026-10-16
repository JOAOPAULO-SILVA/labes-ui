import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AcessibilidadeFacade } from '../../../facades/acessibilidade.facade';
import { PaginaCabecalhoComponent } from '../../../components/pagina-cabecalho/pagina-cabecalho.component';
import { AnaliseTemporalPanoramaComponent } from '../../../components/analise-temporal-panorama/analise-temporal-panorama.component';

@Component({
  selector: 'app-analise-temporal-page',
  standalone: true,
  imports: [PaginaCabecalhoComponent, AnaliseTemporalPanoramaComponent],
  templateUrl: './analise-temporal-page.component.html',
  styleUrl: './analise-temporal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnaliseTemporalPageComponent {
  protected readonly facade = inject(AcessibilidadeFacade);
}
