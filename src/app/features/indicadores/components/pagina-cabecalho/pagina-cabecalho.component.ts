import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Cabeçalho das páginas de indicador: link de volta, título e subtítulo. */
@Component({
  selector: 'app-pagina-cabecalho',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pagina-cabecalho.component.html',
  styleUrl: './pagina-cabecalho.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaCabecalhoComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>(null);
  readonly voltarLink = input<string>('/indicadores');
  readonly voltarLabel = input<string>('Voltar para Indicadores');
}
