import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  TEXTOS_COMPARACAO,
  montarResumoComparacao,
  montarResumoVazio,
  selecionarPontoResumo,
} from '../../mappers/comparacao-grafico.mapper';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

/** Aviso do ano e os quatro cartões; sem série, os cartões mostram "Sem dados". */
@Component({
  selector: 'app-comparacao-resumo',
  standalone: true,
  templateUrl: './comparacao-resumo.component.html',
  styleUrl: './comparacao-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparacaoResumoComponent {
  readonly serie = input<SerieGraficoComparacaoModel | null>(null);
  readonly carregando = input(false);

  protected readonly itens = computed(() => {
    const serie = this.serie();
    return serie ? montarResumoComparacao(serie) : montarResumoVazio();
  });
  protected readonly aviso = computed(() => {
    const serie = this.serie();
    const ponto = serie ? selecionarPontoResumo(serie) : null;
    return ponto ? TEXTOS_COMPARACAO.resumoDoAno(ponto.ano) : '';
  });
}
