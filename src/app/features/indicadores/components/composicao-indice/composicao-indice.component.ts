import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TEXTOS_COMPARACAO } from '../../mappers/comparacao-grafico.mapper';
import { ItemComposicaoIndiceModel } from '../../models/infraestrutura.models';

const ICONES = { sim: 'pi-check-circle', nao: 'pi-times-circle', sem_dados: 'pi-minus-circle' };

/** Situação de cada indicador da escola no ano do resumo. */
@Component({
  selector: 'app-composicao-indice',
  standalone: true,
  templateUrl: './composicao-indice.component.html',
  styleUrl: './composicao-indice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComposicaoIndiceComponent {
  readonly itens = input<ItemComposicaoIndiceModel[]>([]);
  /** Mostra o aviso de que a API ainda não envia o detalhamento. */
  readonly indisponivel = input(false);

  protected readonly textos = TEXTOS_COMPARACAO;
  protected readonly icones = ICONES;
}
