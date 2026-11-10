import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppSelectComponent } from '../../../../shared/ui/select/app-select.component';
import { AppSelectOption } from '../../../../shared/ui/select/app-select.types';
import { TEXTOS_COMPARACAO } from '../../mappers/comparacao-grafico.mapper';
import { ItemComposicaoIndiceModel } from '../../models/infraestrutura.models';

const ICONES = { sim: 'pi-check-circle', nao: 'pi-times-circle', sem_dados: 'pi-minus-circle' };

/**
 * `inicial`: nenhuma escola escolhida. `sem_registro`: o ano é uma lacuna da escola.
 * `pronto`: há composição para o ano (valores podem ser Sim, Não ou Sem dados).
 */
export type EstadoComposicaoIndice = 'inicial' | 'carregando' | 'erro' | 'sem_registro' | 'pronto';

/** Situação de cada indicador da escola no ano selecionado. */
@Component({
  selector: 'app-composicao-indice',
  standalone: true,
  imports: [FormsModule, AppSelectComponent],
  templateUrl: './composicao-indice.component.html',
  styleUrl: './composicao-indice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComposicaoIndiceComponent {
  readonly itens = input<ItemComposicaoIndiceModel[]>([]);
  readonly estado = input<EstadoComposicaoIndice>('inicial');
  /** Ano exibido; `null` antes de haver série. */
  readonly ano = input<number | null>(null);
  /** Anos que podem ser escolhidos no seletor. */
  readonly anos = input<readonly number[]>([]);
  /** Linha de resumo das contagens do ano, exibida abaixo da lista. */
  readonly resumo = input<string | null>(null);
  readonly anoChange = output<number>();

  protected readonly textos = TEXTOS_COMPARACAO;
  protected readonly icones = ICONES;

  protected readonly opcoesAno = computed<AppSelectOption<number>[]>(() =>
    this.anos().map((ano) => ({ label: String(ano), value: ano })),
  );

  protected readonly mensagem = computed(() => {
    const t = this.textos.composicao;
    switch (this.estado()) {
      case 'inicial':
        return t.inicial;
      case 'erro':
        return t.erro;
      case 'sem_registro':
        return t.semRegistro(this.ano() ?? 0);
      default:
        return null;
    }
  });

  protected onAnoChange(ano: number | null): void {
    if (ano !== null && ano !== this.ano()) this.anoChange.emit(ano);
  }
}
