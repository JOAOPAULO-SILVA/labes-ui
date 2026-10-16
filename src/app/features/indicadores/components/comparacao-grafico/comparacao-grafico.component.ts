import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotlyComponent, PlotlyService } from 'angular-plotly.js';

import { montarFiguraComparacao } from '../../mappers/comparacao-grafico.mapper';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

PlotlyService.setPlotly(PlotlyJS);

@Component({
  selector: 'app-comparacao-grafico',
  standalone: true,
  imports: [PlotlyComponent],
  templateUrl: './comparacao-grafico.component.html',
  styleUrl: './comparacao-grafico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparacaoGraficoComponent {
  readonly serie = input.required<SerieGraficoComparacaoModel>();
  readonly titulo = input('Evolução do índice: Escola × Média municipal');

  protected readonly figura = computed(() => montarFiguraComparacao(this.serie()));
  protected readonly config = { displayModeBar: false, responsive: true };
}
