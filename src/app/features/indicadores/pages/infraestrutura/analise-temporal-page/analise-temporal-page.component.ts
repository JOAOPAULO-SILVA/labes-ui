import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';

import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { EscolaBuscaComponent } from '../../../components/escola-busca/escola-busca.component';
import { ComparacaoGraficoComponent } from '../../../components/comparacao-grafico/comparacao-grafico.component';
import { ComparacaoResumoComponent } from '../../../components/comparacao-resumo/comparacao-resumo.component';
import { prepararSerieGraficoComparacao } from '../../../mappers/infraestrutura.mapper';
import {
  ClassificacaoSerieComparacao,
  classificarSerieComparacao,
} from '../../../mappers/comparacao-grafico.mapper';
import {
  ComparacaoEscolaMunicipioModel,
  ErroComparacaoMunicipioModel,
  EscolaBuscaModel,
  SerieGraficoComparacaoModel,
} from '../../../models/infraestrutura.models';

type EstadoComparacao =
  | { tipo: 'inicial' }
  | { tipo: 'carregando'; escola: EscolaBuscaModel }
  | { tipo: 'erro'; escola: EscolaBuscaModel; erro: ErroComparacaoMunicipioModel }
  | {
      tipo: 'sucesso';
      escola: EscolaBuscaModel;
      comparacao: ComparacaoEscolaMunicipioModel;
      serie: SerieGraficoComparacaoModel;
      classificacao: ClassificacaoSerieComparacao;
    };

type EstadoCatalogo = 'carregando' | 'pronto' | 'erro';

@Component({
  selector: 'app-analise-temporal-page',
  standalone: true,
  imports: [EscolaBuscaComponent, ComparacaoGraficoComponent, ComparacaoResumoComponent],
  templateUrl: './analise-temporal-page.component.html',
  styleUrl: './analise-temporal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnaliseTemporalPageComponent implements OnInit {
  private readonly facade = inject(InfraestruturaFacade);
  private readonly destroyRef = inject(DestroyRef);

  /** Cada nova seleção cancela a requisição anterior (switchMap). */
  private readonly selecao$ = new Subject<EscolaBuscaModel | null>();

  protected readonly escolas = signal<EscolaBuscaModel[]>([]);
  protected readonly catalogo = signal<EstadoCatalogo>('carregando');
  protected readonly escolaSelecionada = signal<EscolaBuscaModel | null>(null);
  protected readonly estado = signal<EstadoComparacao>({ tipo: 'inicial' });

  ngOnInit(): void {
    this.carregarCatalogo();

    this.selecao$
      .pipe(
        switchMap((escola) =>
          escola ? this.carregarComparacao(escola) : of({ tipo: 'inicial' as const }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estado) => this.estado.set(estado));
  }

  protected carregarCatalogo(): void {
    this.catalogo.set('carregando');
    this.facade
      .listarEscolasParaBusca()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (escolas) => {
          this.escolas.set(escolas);
          this.catalogo.set('pronto');
        },
        error: () => this.catalogo.set('erro'),
      });
  }

  protected selecionar(escola: EscolaBuscaModel): void {
    this.escolaSelecionada.set(escola);
    this.selecao$.next(escola);
  }

  protected limpar(): void {
    this.escolaSelecionada.set(null);
    this.selecao$.next(null);
  }

  protected tentarNovamente(): void {
    const escola = this.escolaSelecionada();
    if (escola) this.selecao$.next(escola);
  }

  private carregarComparacao(escola: EscolaBuscaModel): Observable<EstadoComparacao> {
    return this.facade.obterComparacaoEscolaMunicipio(escola.co_entidade).pipe(
      map((comparacao): EstadoComparacao => {
        const serie = prepararSerieGraficoComparacao(comparacao.serie, comparacao.metodologia.anos);
        return {
          tipo: 'sucesso',
          escola,
          comparacao,
          serie,
          classificacao: classificarSerieComparacao(serie),
        };
      }),
      catchError((erro: ErroComparacaoMunicipioModel) =>
        of<EstadoComparacao>({ tipo: 'erro', escola, erro }),
      ),
      startWith<EstadoComparacao>({ tipo: 'carregando', escola }),
    );
  }
}
