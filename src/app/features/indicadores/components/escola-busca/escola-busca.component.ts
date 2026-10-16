import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { filtrarEscolasBusca } from '../../mappers/infraestrutura.mapper';
import { EscolaBuscaModel } from '../../models/infraestrutura.models';

/**
 * Busca de escolas com seleção única: mostra nome e município, emite um único
 * `co_entidade` ao selecionar e oferece uma ação explícita para limpar.
 */
@Component({
  selector: 'app-escola-busca',
  standalone: true,
  templateUrl: './escola-busca.component.html',
  styleUrl: './escola-busca.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscolaBuscaComponent {
  readonly escolas = input<EscolaBuscaModel[]>([]);
  readonly selecionada = input<EscolaBuscaModel | null>(null);
  readonly desabilitada = input(false);

  readonly selecionar = output<EscolaBuscaModel>();
  readonly limpar = output<void>();

  protected readonly termo = signal('');
  protected readonly resultados = computed(() =>
    filtrarEscolasBusca(this.escolas(), this.termo(), 8),
  );
  protected readonly buscou = computed(() => this.termo().trim().length > 0);

  protected onTermoChange(event: Event): void {
    this.termo.set((event.target as HTMLInputElement).value);
  }

  protected limparTermo(): void {
    this.termo.set('');
  }

  protected onSelecionar(escola: EscolaBuscaModel): void {
    this.termo.set('');
    this.selecionar.emit(escola);
  }

  protected onLimpar(): void {
    this.termo.set('');
    this.limpar.emit();
  }
}
