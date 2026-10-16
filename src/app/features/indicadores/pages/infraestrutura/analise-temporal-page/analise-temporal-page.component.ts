import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';

import { AppSelectComponent } from '../../../../../shared/ui/select/app-select.component';
import { AppSelectOption } from '../../../../../shared/ui/select/app-select.types';
import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { ComparacaoGraficoComponent } from '../../../components/comparacao-grafico/comparacao-grafico.component';
import { ComparacaoResumoComponent } from '../../../components/comparacao-resumo/comparacao-resumo.component';
import { ComposicaoIndiceComponent } from '../../../components/composicao-indice/composicao-indice.component';
import { PaginaCabecalhoComponent } from '../../../components/pagina-cabecalho/pagina-cabecalho.component';
import { prepararSerieGraficoComparacao } from '../../../mappers/infraestrutura.mapper';
import {
  ClassificacaoSerieComparacao,
  INDICADORES_METODOLOGIA,
  TEXTOS_COMPARACAO,
  classificarSerieComparacao,
  montarComposicaoIndice,
  selecionarPontoResumo,
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

/** Erros em que tentar de novo pode resolver. */
const ERROS_RECUPERAVEIS = new Set(['internal_error', 'warehouse_unavailable', 'network_error']);

@Component({
  selector: 'app-analise-temporal-page',
  standalone: true,
  imports: [
    FormsModule,
    AppSelectComponent,
    ComparacaoGraficoComponent,
    ComparacaoResumoComponent,
    ComposicaoIndiceComponent,
    PaginaCabecalhoComponent,
  ],
  templateUrl: './analise-temporal-page.component.html',
  styleUrl: './analise-temporal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnaliseTemporalPageComponent implements OnInit {
  private readonly facade = inject(InfraestruturaFacade);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly textos = TEXTOS_COMPARACAO;

  /** Cada nova seleção cancela a requisição anterior (switchMap). */
  private readonly selecao$ = new Subject<EscolaBuscaModel | null>();

  protected readonly escolas = signal<EscolaBuscaModel[]>([]);
  protected readonly catalogo = signal<EstadoCatalogo>('carregando');
  protected readonly escolaSelecionada = signal<EscolaBuscaModel | null>(null);
  protected readonly estado = signal<EstadoComparacao>({ tipo: 'inicial' });
  private readonly labelsIndicadores = signal<ReadonlyMap<string, string>>(new Map());

  protected readonly opcoesEscola = computed<AppSelectOption<number>[]>(() =>
    this.escolas().map((e) => ({
      label: e.nome,
      value: e.co_entidade,
      description: `${e.municipio ?? 'Município não informado'} · INEP ${e.co_entidade}`,
    })),
  );
  protected readonly opcoesMunicipio = computed<AppSelectOption<string>[]>(() => {
    const municipio = this.escolaSelecionada()?.municipio;
    return municipio ? [{ label: municipio, value: municipio }] : [];
  });

  /** Série exibida nos cartões e no gráfico; nula fora do estado de sucesso com dados. */
  protected readonly serie = computed(() => {
    const e = this.estado();
    return e.tipo === 'sucesso' && e.classificacao !== 'sem_historico' ? e.serie : null;
  });
  protected readonly carregando = computed(() => this.estado().tipo === 'carregando');

  protected readonly mensagemGrafico = computed(() => {
    const e = this.estado();
    if (this.catalogo() === 'erro') return 'Não foi possível carregar a lista de escolas.';
    if (e.tipo === 'inicial') return this.textos.inicial;
    if (e.tipo === 'erro') return e.erro.mensagem;
    if (e.tipo === 'sucesso' && e.classificacao === 'sem_historico')
      return this.textos.semHistorico;
    return null;
  });
  protected readonly erroGrafico = computed(
    () => this.catalogo() === 'erro' || this.estado().tipo === 'erro',
  );
  protected readonly acaoGrafico = computed(() => {
    const e = this.estado();
    if (this.catalogo() === 'erro') return 'Tentar novamente';
    return e.tipo === 'erro' && ERROS_RECUPERAVEIS.has(e.erro.codigo) ? 'Tentar novamente' : null;
  });

  protected readonly composicao = computed(() => {
    const e = this.estado();
    const serie = this.serie();
    const ponto = serie ? selecionarPontoResumo(serie) : null;
    const chaves =
      e.tipo === 'sucesso' ? e.comparacao.metodologia.indicadores : INDICADORES_METODOLOGIA;
    return {
      itens: montarComposicaoIndice(ponto, chaves, this.labelsIndicadores()),
      indisponivel: ponto !== null && ponto.indicadores === null,
    };
  });

  ngOnInit(): void {
    this.carregarCatalogo();

    this.facade
      .listarFiltros()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filtros) =>
        this.labelsIndicadores.set(new Map(filtros.metricas.map((m) => [m.chave, m.label]))),
      );

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

  protected onEscolaChange(coEntidade: number | null): void {
    const escola = this.escolas().find((e) => e.co_entidade === coEntidade) ?? null;
    if (escola) {
      this.selecionar(escola);
    } else {
      this.limpar();
    }
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
    if (this.catalogo() === 'erro') {
      this.carregarCatalogo();
      return;
    }
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
