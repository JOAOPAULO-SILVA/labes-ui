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
import {
  ComposicaoIndiceComponent,
  EstadoComposicaoIndice,
} from '../../../components/composicao-indice/composicao-indice.component';
import {
  EstadoPainelTerritorial,
  PainelTerritorialComponent,
} from '../../../components/painel-territorial/painel-territorial.component';
import { PaginaCabecalhoComponent } from '../../../components/pagina-cabecalho/pagina-cabecalho.component';
import { prepararSerieGraficoComparacao } from '../../../mappers/infraestrutura.mapper';
import {
  ClassificacaoSerieComparacao,
  INDICADORES_METODOLOGIA,
  TEXTOS_COMPARACAO,
  classificarSerieComparacao,
  montarComposicaoIndice,
  montarComposicaoTerritorial,
  selecionarPontoResumo,
} from '../../../mappers/comparacao-grafico.mapper';
import {
  ComparacaoEscolaMunicipioModel,
  ErroComparacaoMunicipioModel,
  EscolaBuscaModel,
  ItemComposicaoIndiceModel,
  ItemComposicaoTerritorialModel,
  SerieGraficoComparacaoModel,
} from '../../../models/infraestrutura.models';

interface TerritorialViewModel {
  estado: EstadoPainelTerritorial;
  itens: ItemComposicaoTerritorialModel[];
  ano: number | null;
  municipio: string | null;
  escolasReferencia: number;
  coberturaReduzida: boolean;
}

interface ComposicaoViewModel {
  estado: EstadoComposicaoIndice;
  itens: ItemComposicaoIndiceModel[];
  ano: number | null;
  anos: number[];
  resumo: string | null;
}

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
    PainelTerritorialComponent,
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
  /** Município escolhido no filtro; restringe a lista de escolas. */
  protected readonly municipioSelecionado = signal<string | null>(null);
  protected readonly estado = signal<EstadoComparacao>({ tipo: 'inicial' });

  protected readonly opcoesEscola = computed<AppSelectOption<number>[]>(() =>
    this.escolasDoMunicipio().map((e) => ({
      label: e.nome,
      value: e.co_entidade,
      description: `${e.municipio ?? 'Município não informado'} · INEP ${e.co_entidade}`,
    })),
  );
  protected readonly escolasDoMunicipio = computed(() => {
    const municipio = this.municipioSelecionado();
    const escolas = this.escolas();
    return municipio ? escolas.filter((e) => e.municipio === municipio) : escolas;
  });
  protected readonly opcoesMunicipio = computed<AppSelectOption<string>[]>(() =>
    [
      ...new Set(
        this.escolas()
          .map((e) => e.municipio)
          .filter((m): m is string => !!m),
      ),
    ]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((m) => ({ label: m, value: m })),
  );

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

  /** Ano escolhido no seletor da composição; `null` usa o último ano disponível. */
  protected readonly anoComposicao = signal<number | null>(null);

  /** Ano e ponto da série usados pelas duas composições; `null` fora do estado de sucesso. */
  private readonly pontoSelecionado = computed(() => {
    const e = this.estado();
    if (e.tipo !== 'sucesso') return null;
    const ano =
      this.anoComposicao() ?? selecionarPontoResumo(e.serie)?.ano ?? e.serie.anos.at(-1) ?? null;
    return { ano, ponto: e.serie.pontos.find((p) => p.ano === ano) ?? null };
  });

  protected readonly territorial = computed<TerritorialViewModel>(() => {
    const e = this.estado();
    const vazio = {
      itens: [],
      ano: null,
      municipio: null,
      escolasReferencia: 0,
      coberturaReduzida: false,
    };
    if (e.tipo !== 'sucesso') {
      const estado: EstadoPainelTerritorial =
        e.tipo === 'carregando' ? 'carregando' : e.tipo === 'erro' ? 'erro' : 'inicial';
      return { ...vazio, estado };
    }

    const { ano, ponto } = this.pontoSelecionado()!;
    if (!ponto || !ponto.registro_historico_disponivel || !ponto.municipio_referencia) {
      return { ...vazio, estado: 'sem_registro', ano };
    }
    const itens = montarComposicaoTerritorial(ponto, e.comparacao.metodologia.indicadores);
    return {
      estado: itens.length > 0 && ponto.denominador_pares > 0 ? 'pronto' : 'sem_pares',
      itens,
      ano,
      municipio: ponto.municipio_referencia.no_municipio,
      escolasReferencia: ponto.denominador_pares,
      coberturaReduzida: ponto.cobertura_indicadores_reduzida,
    };
  });

  protected readonly composicao = computed<ComposicaoViewModel>(() => {
    const e = this.estado();
    if (e.tipo !== 'sucesso') {
      const estado: EstadoComposicaoIndice =
        e.tipo === 'carregando' ? 'carregando' : e.tipo === 'erro' ? 'erro' : 'inicial';
      return {
        estado,
        itens: montarComposicaoIndice(null, INDICADORES_METODOLOGIA),
        ano: null,
        anos: [],
        resumo: null,
      };
    }

    const anos = e.serie.anos;
    const { ano, ponto } = this.pontoSelecionado()!;
    const comRegistro = ponto !== null && ponto.registro_historico_disponivel;
    const t = this.textos.composicao;

    return {
      estado: comRegistro ? 'pronto' : 'sem_registro',
      itens: montarComposicaoIndice(
        comRegistro ? ponto : null,
        e.comparacao.metodologia.indicadores,
      ),
      ano,
      anos,
      resumo: comRegistro
        ? t.resumo(
            ponto.quantidade_indicadores_presentes,
            ponto.quantidade_indicadores_validos,
            ponto.total_indicadores,
          )
        : null,
    };
  });

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

  protected onEscolaChange(coEntidade: number | null): void {
    const escola = this.escolas().find((e) => e.co_entidade === coEntidade) ?? null;
    if (escola) {
      this.selecionar(escola);
    } else {
      this.limpar();
    }
  }

  /** Escola de outro município é desmarcada; a mesma escola continua selecionada. */
  protected onMunicipioChange(municipio: string | null): void {
    this.municipioSelecionado.set(municipio);
    const escola = this.escolaSelecionada();
    if (escola && municipio && escola.municipio !== municipio) this.limpar();
  }

  protected selecionar(escola: EscolaBuscaModel): void {
    this.escolaSelecionada.set(escola);
    if (escola.municipio) this.municipioSelecionado.set(escola.municipio);
    this.anoComposicao.set(null);
    this.selecao$.next(escola);
  }

  protected onAnoComposicaoChange(ano: number): void {
    this.anoComposicao.set(ano);
  }

  protected limpar(): void {
    this.escolaSelecionada.set(null);
    this.anoComposicao.set(null);
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
