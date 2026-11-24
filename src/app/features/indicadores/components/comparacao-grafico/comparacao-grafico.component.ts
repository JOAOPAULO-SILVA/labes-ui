import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotlyComponent, PlotlyService } from 'angular-plotly.js';

import { TEXTOS_COMPARACAO, montarFiguraComparacao } from '../../mappers/comparacao-grafico.mapper';
import { PlotlyFigure } from '../../../../core/api/models/plotly-figure';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

/** Item da legenda exibida no lugar do gráfico vazio; `marca` escolhe a cor da linha. */
export interface ItemLegendaGrafico {
  rotulo: string;
  marca: 'escola' | 'municipio';
}

const LEGENDA_COMPARACAO: readonly ItemLegendaGrafico[] = [
  { rotulo: TEXTOS_COMPARACAO.serieEscola, marca: 'escola' },
  { rotulo: TEXTOS_COMPARACAO.serieMunicipio, marca: 'municipio' },
];

PlotlyService.setPlotly(PlotlyJS);

/**
 * Card do gráfico Escola × Média municipal. Sem série, mostra no lugar do gráfico
 * a mensagem do estado (inicial, erro ou dados insuficientes), como no protótipo.
 * A aba Município passa a própria figura (`figura`) e a legenda de uma linha só.
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
  /** Figura pronta; tem precedência sobre `serie`. */
  readonly figuraPronta = input<PlotlyFigure | null>(null);
  readonly legenda = input<readonly ItemLegendaGrafico[]>(LEGENDA_COMPARACAO);
  readonly descricaoCarregando = input('Carregando dados da escola selecionada.');
  readonly titulo = input<string>(TEXTOS_COMPARACAO.tituloGrafico);
  readonly carregando = input(false);
  readonly mensagem = input<string | null>(null);
  readonly erro = input(false);
  readonly acaoLabel = input<string | null>(null);

  readonly acao = output<void>();

  protected readonly figura = computed(() => {
    const pronta = this.figuraPronta();
    if (pronta) return pronta;
    const serie = this.serie();
    return serie ? montarFiguraComparacao(serie) : null;
  });
  protected readonly config = { displayModeBar: false, responsive: true };
}
