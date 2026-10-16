import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IndicadorCardComponent } from '../../../../shared/components/indicador-card/indicador-card.component';
import { montarResumoComparacao } from '../../mappers/comparacao-grafico.mapper';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

@Component({
  selector: 'app-comparacao-resumo',
  standalone: true,
  imports: [IndicadorCardComponent],
  templateUrl: './comparacao-resumo.component.html',
  styleUrl: './comparacao-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparacaoResumoComponent {
  readonly serie = input.required<SerieGraficoComparacaoModel>();

  protected readonly itens = computed(() => montarResumoComparacao(this.serie()));
}
