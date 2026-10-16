import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotlyComponent, PlotlyService } from 'angular-plotly.js';

import { TEXTOS_COMPARACAO, montarFiguraComparacao } from '../../mappers/comparacao-grafico.mapper';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

PlotlyService.setPlotly(PlotlyJS);

/**
 * Card do gráfico Escola × Média municipal. Sem série, mostra no lugar do gráfico
 * a mensagem do estado (inicial, erro ou dados insuficientes), como no protótipo.
 */
@Component({
  selector: 'app-comparacao-grafico',
  standalone: true,
  imports: [PlotlyComponent],
  templateUrl: './comparacao-grafico.component.html',
  styleUrl: './comparacao-grafico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparacaoGraficoComponent {
  readonly serie = input<SerieGraficoComparacaoModel | null>(null);
  readonly titulo = input(TEXTOS_COMPARACAO.tituloGrafico);
  readonly carregando = input(false);
  readonly mensagem = input<string | null>(null);
  readonly erro = input(false);
  readonly acaoLabel = input<string | null>(null);

  readonly acao = output<void>();

  protected readonly textos = TEXTOS_COMPARACAO;
  protected readonly figura = computed(() => {
    const serie = this.serie();
    return serie ? montarFiguraComparacao(serie) : null;
  });
  protected readonly config = { displayModeBar: false, responsive: true };
}
