import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TEXTOS_COMPARACAO, formatarPercentual } from '../../mappers/comparacao-grafico.mapper';
import { ItemComposicaoTerritorialModel } from '../../models/infraestrutura.models';

/**
 * `sem_registro`: o ano é uma lacuna da escola (sem município de referência).
 * `sem_pares`: há município, mas nenhuma outra escola com registro no ano.
 */
export type EstadoPainelTerritorial =
  | 'inicial'
  | 'carregando'
  | 'erro'
  | 'sem_registro'
  | 'sem_pares'
  | 'pronto';

interface LinhaTerritorialModel extends ItemComposicaoTerritorialModel {
  percentualTexto: string;
  tooltip: string;
}

/**
 * Painel territorial: para cada indicador, quantas das demais escolas do município
 * têm o recurso, quantas têm informação válida e o percentual de presença.
 */
@Component({
  selector: 'app-painel-territorial',
  standalone: true,
  templateUrl: './painel-territorial.component.html',
  styleUrl: './painel-territorial.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelTerritorialComponent {
  readonly itens = input<ItemComposicaoTerritorialModel[]>([]);
  readonly estado = input<EstadoPainelTerritorial>('inicial');
  readonly ano = input<number | null>(null);
  readonly municipio = input<string | null>(null);
  readonly escolasReferencia = input(0);
  /** Alerta informativo da escola selecionada (cobertura abaixo de 60%); não oculta dados. */
  readonly coberturaReduzida = input(false);
  /** Quantidade de linhas do skeleton enquanto carrega. */
  readonly totalIndicadores = input(17);

  protected readonly textos = TEXTOS_COMPARACAO.territorial;

  protected readonly linhas = computed<LinhaTerritorialModel[]>(() =>
    this.itens().map((item) => {
      const percentualTexto = formatarPercentual(item.percentual);
      return {
        ...item,
        percentualTexto,
        tooltip: this.textos.tooltip(
          item.label,
          item.presentes,
          item.validos,
          item.semDados,
          percentualTexto,
          formatarPercentual(item.cobertura),
        ),
      };
    }),
  );

  protected readonly skeleton = computed(() =>
    Array.from({ length: this.totalIndicadores() }, (_, i) => i),
  );

  protected readonly mensagem = computed(() => {
    const ano = this.ano() ?? 0;
    switch (this.estado()) {
      case 'inicial':
        return this.textos.inicial;
      case 'erro':
        return this.textos.erro;
      case 'sem_registro':
        return this.textos.semRegistro(ano);
      case 'sem_pares':
        return this.textos.semPares(ano);
      default:
        return null;
    }
  });

  protected readonly mostrarAviso = computed(
    () => this.coberturaReduzida() && this.ano() !== null && this.estado() !== 'carregando',
  );
}
