import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  TEXTOS_COMPARACAO,
  montarResumoComparacao,
  selecionarPontoResumo,
} from '../../mappers/comparacao-grafico.mapper';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

@Component({
  selector: 'app-comparacao-resumo',
  standalone: true,
  templateUrl: './comparacao-resumo.component.html',
  styleUrl: './comparacao-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparacaoResumoComponent {
  readonly serie = input.required<SerieGraficoComparacaoModel>();

  protected readonly itens = computed(() => montarResumoComparacao(this.serie()));
  protected readonly aviso = computed(() => {
    const ponto = selecionarPontoResumo(this.serie());
    return ponto ? TEXTOS_COMPARACAO.resumoDoAno(ponto.ano) : '';
  });
}
