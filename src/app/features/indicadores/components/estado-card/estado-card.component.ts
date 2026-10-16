import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type TipoEstadoCard = 'info' | 'aviso' | 'erro';

const ICONES: Record<TipoEstadoCard, string> = {
  info: 'pi-info-circle',
  aviso: 'pi-info-circle',
  erro: 'pi-exclamation-triangle',
};

/** Mensagem de estado (orientação, aviso ou erro) com ação opcional. */
@Component({
  selector: 'app-estado-card',
  standalone: true,
  templateUrl: './estado-card.component.html',
  styleUrl: './estado-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoCardComponent {
  readonly tipo = input<TipoEstadoCard>('info');
  readonly titulo = input.required<string>();
  readonly icone = input<string | null>(null);
  readonly acaoLabel = input<string | null>(null);

  readonly acao = output<void>();

  protected readonly iconeClasse = computed(() => this.icone() ?? ICONES[this.tipo()]);
}
