import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CartaoAnoMunicipioModel, TEXTOS_MUNICIPIO } from '../../mappers/visao-municipio.mapper';

/**
 * "Escolas elegíveis e cobertura por ano" (REQ07 §3.6): um cartão por ano do intervalo.
 * Com algum ano em denominador zero, mostra também o cartão "Como interpretar".
 */
@Component({
  selector: 'app-cobertura-anos',
  standalone: true,
  templateUrl: './cobertura-anos.component.html',
  styleUrl: './cobertura-anos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoberturaAnosComponent {
  readonly cartoes = input<readonly CartaoAnoMunicipioModel[]>([]);
  readonly comoInterpretar = input(false);
  readonly carregando = input(false);

  protected readonly textos = TEXTOS_MUNICIPIO;
}
