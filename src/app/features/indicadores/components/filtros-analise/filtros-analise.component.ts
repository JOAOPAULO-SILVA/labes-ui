import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  input,
  output,
  signal,
} from '@angular/core';

import { AppDialogComponent } from '../../../../shared/ui/dialog/app-dialog.component';

/**
 * Cartão de filtros da análise temporal. Em tela larga, mostra os campos (`campos`) direto
 * no cartão. Em celular (REQ07 §2.2), mostra o cartão "Filtros da análise" recolhido, com o
 * resumo dos filtros e "Ajustar filtros", que abre uma gaveta com os campos e "Aplicar".
 */
@Component({
  selector: 'app-filtros-analise',
  standalone: true,
  imports: [NgTemplateOutlet, AppDialogComponent],
  templateUrl: './filtros-analise.component.html',
  styleUrl: './filtros-analise.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosAnaliseComponent {
  readonly campos = input.required<TemplateRef<unknown>>();
  /** Layout de celular: cartão recolhido + gaveta. */
  readonly compacto = input(false);
  /** Resumo exibido no cartão recolhido, ex.: "Selecione uma escola · Todos os municípios". */
  readonly resumo = input('');
  /** Ações (Aplicar/Limpar) exibidas abaixo dos campos em tela larga. */
  readonly acoes = input<TemplateRef<unknown> | null>(null);
  readonly aplicarDesabilitado = input(false);

  /** Na gaveta: o usuário confirmou os filtros. */
  readonly aplicar = output<void>();
  /** Gaveta aberta (o rascunho deve partir dos filtros aplicados). */
  readonly abrir = output<void>();
  /** Gaveta fechada sem aplicar (o rascunho deve ser descartado). */
  readonly descartar = output<void>();

  protected readonly gavetaAberta = signal(false);
  private aplicou = false;

  protected abrirGaveta(): void {
    this.aplicou = false;
    this.abrir.emit();
    this.gavetaAberta.set(true);
  }

  protected confirmar(): void {
    this.aplicou = true;
    this.aplicar.emit();
    this.gavetaAberta.set(false);
  }

  protected onVisibilidade(visivel: boolean): void {
    if (visivel) return;
    this.gavetaAberta.set(false);
    if (!this.aplicou) this.descartar.emit();
  }
}
