import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  ItemResumoComparacaoModel,
  TEXTOS_COMPARACAO,
  montarResumoComparacao,
  montarResumoVazio,
  selecionarPontoResumo,
} from '../../mappers/comparacao-grafico.mapper';
import { SerieGraficoComparacaoModel } from '../../models/infraestrutura.models';

/**
 * Aviso do ano e os quatro cartões; sem série, os cartões mostram "Sem dados".
 * A aba Município passa os próprios cartões (`itensProntos`) e o aviso (`avisoPronto`).
 */
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
  readonly itensProntos = input<readonly ItemResumoComparacaoModel[] | null>(null);
  readonly avisoPronto = input<string | null>(null);

  protected readonly itens = computed(() => {
    const prontos = this.itensProntos();
    if (prontos) return prontos;
    const serie = this.serie();
    return serie ? montarResumoComparacao(serie) : montarResumoVazio();
  });
  protected readonly aviso = computed(() => {
    if (this.itensProntos()) return this.avisoPronto() ?? '';
    const serie = this.serie();
    const ponto = serie ? selecionarPontoResumo(serie) : null;
    return ponto ? TEXTOS_COMPARACAO.resumoDoAno(ponto.ano) : '';
  });
}
