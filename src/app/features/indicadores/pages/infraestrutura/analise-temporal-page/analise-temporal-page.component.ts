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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

import { AppSelectComponent } from '../../../../../shared/ui/select/app-select.component';
import { AppSelectOption } from '../../../../../shared/ui/select/app-select.types';
import { AppRangeSliderComponent } from '../../../../../shared/ui/range-slider/app-range-slider.component';
import { AppRangeValue } from '../../../../../shared/ui/range-slider/app-range-slider.types';
import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { AbasAnaliseTemporalComponent } from '../../../components/abas-analise-temporal/abas-analise-temporal.component';
import { ComparacaoGraficoComponent } from '../../../components/comparacao-grafico/comparacao-grafico.component';
import { ComparacaoResumoComponent } from '../../../components/comparacao-resumo/comparacao-resumo.component';
import {
  ComposicaoIndiceComponent,
  EstadoComposicaoIndice,
} from '../../../components/composicao-indice/composicao-indice.component';
import { FiltrosAnaliseComponent } from '../../../components/filtros-analise/filtros-analise.component';
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
  montarResumoAnos,
  selecionarPontoResumo,
} from '../../../mappers/comparacao-grafico.mapper';
import {
  ComparacaoEscolaMunicipioModel,
  ErroComparacaoMunicipioModel,
  EscolaBuscaModel,
  ItemComposicaoIndiceModel,
  ItemComposicaoTerritorialModel,
  REDES_ENSINO,
  RecorteTemporalModel,
  RedeEnsinoModel,
  SerieGraficoComparacaoModel,
} from '../../../models/infraestrutura.models';
import { injectTelaCompacta } from '../../../utils/tela-compacta';
import {
  ANOS_PADRAO,
  FiltrosEscolaModel,
  FILTROS_ESCOLA_PADRAO,
  anosDisponiveisDoCatalogo,
  intervaloAnos,
  normalizarFiltrosEscola,
  resumoFiltrosEscola,
} from './filtros-escola';

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
  resumoAnos: string[];
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

interface Consulta {
  escola: EscolaBuscaModel | null;
  recorte: RecorteTemporalModel;
}

/** Erros em que tentar de novo pode resolver. */
const ERROS_RECUPERAVEIS = new Set([
  'internal_error',
  'warehouse_unavailable',
  'source_data_inconsistent',
  'network_error',
]);

/**
 * Aba "Análise por Escola" (REQ07 Frente 1, FE12): uma escola-alvo comparada à média das
 * demais escolas do mesmo município, no recorte de rede e anos escolhido nos filtros.
 */
@Component({
  selector: 'app-analise-temporal-page',
  standalone: true,
  imports: [
    FormsModule,
    AppSelectComponent,
    AppRangeSliderComponent,
    AbasAnaliseTemporalComponent,
    ComparacaoGraficoComponent,
    ComparacaoResumoComponent,
    ComposicaoIndiceComponent,
    FiltrosAnaliseComponent,
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
  protected readonly telaCompacta = injectTelaCompacta();

  protected readonly escolas = signal<EscolaBuscaModel[]>([]);
  protected readonly catalogo = signal<EstadoCatalogo>('carregando');
  /** Anos existentes na base (`/filtros`); define os limites do slider. */
  protected readonly anosDisponiveis = signal<readonly number[]>([]);

  /** Filtros que valem para a consulta. */
  protected readonly filtros = signal<FiltrosEscolaModel>(FILTROS_ESCOLA_PADRAO);
  /**
   * Filtros em edição nos campos. Em tela larga são aplicados a cada mudança; no celular,
   * só quando o usuário toca em "Aplicar" na gaveta (REQ07 §2.2).
   */
  protected readonly rascunho = signal<FiltrosEscolaModel>(FILTROS_ESCOLA_PADRAO);
  protected readonly estado = signal<EstadoComparacao>({ tipo: 'inicial' });

  protected readonly limitesAnos = computed(() => intervaloAnos(this.anosDisponiveis()));

  protected readonly escolaSelecionada = computed(
    () => this.escolas().find((e) => e.co_entidade === this.filtros().escola) ?? null,
  );

  /** Escolas que passam nos filtros de município e dependência do rascunho. */
  private readonly escolasFiltradas = computed(() => {
    const { municipio, dependenciaEscola } = this.rascunho();
    return this.escolas().filter(
      (e) =>
        (!municipio || e.municipio === municipio) &&
        (!dependenciaEscola || e.dependencia === dependenciaEscola),
    );
  });

  protected readonly opcoesEscola = computed<AppSelectOption<number>[]>(() =>
    this.escolasFiltradas().map((e) => ({
      label: e.nome,
      value: e.co_entidade,
      description: `${e.municipio ?? 'Município não informado'} · INEP ${e.co_entidade}`,
    })),
  );
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
  protected readonly opcoesDependenciaEscola = computed<AppSelectOption<string>[]>(() =>
    [
      ...new Set(
        this.escolas()
          .map((e) => e.dependencia)
          .filter((d): d is string => !!d),
      ),
    ]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((d) => ({ label: d, value: d })),
  );
  protected readonly opcoesRede: AppSelectOption<RedeEnsinoModel>[] = REDES_ENSINO.map((r) => ({
    label: r,
    value: r,
  }));

  protected readonly resumoFiltros = computed(() =>
    resumoFiltrosEscola(this.filtros(), this.escolaSelecionada()?.nome ?? null, this.limitesAnos()),
  );

  /** Série exibida nos cartões e no gráfico; nula fora do estado de sucesso com dados. */
  protected readonly serie = computed(() => {
    const e = this.estado();
    return e.tipo === 'sucesso' && e.classificacao !== 'sem_historico' ? e.serie : null;
  });
  protected readonly carregando = computed(() => this.estado().tipo === 'carregando');
  protected readonly dicaGrafico = computed(() =>
    this.telaCompacta() ? this.textos.dicaGraficoToque : this.textos.dicaGrafico,
  );

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

  /** Ano escolhido no seletor da composição; `null` usa o último ano do intervalo. */
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
    if (e.classificacao === 'sem_historico') return { ...vazio, estado: 'sem_dados' };

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
    const vazio = { ano: null, anos: [], resumo: null, resumoAnos: [] };
    if (e.tipo !== 'sucesso') {
      const estado: EstadoComposicaoIndice =
        e.tipo === 'carregando' ? 'carregando' : e.tipo === 'erro' ? 'erro' : 'inicial';
      return { ...vazio, estado, itens: montarComposicaoIndice(null, INDICADORES_METODOLOGIA) };
    }
    if (e.classificacao === 'sem_historico') {
      return {
        ...vazio,
        estado: 'sem_dados',
        itens: montarComposicaoIndice(null, e.comparacao.metodologia.indicadores),
      };
    }

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
      anos: e.serie.anos,
      resumo: comRegistro
        ? t.resumo(
            ponto.quantidade_indicadores_presentes,
            ponto.quantidade_indicadores_validos,
            ponto.total_indicadores,
          )
        : null,
      resumoAnos: montarResumoAnos(e.serie),
    };
  });

  /** Escola e recorte da consulta; só muda quando algum valor de fato muda. */
  private readonly consulta = computed<Consulta | null>(() => {
    if (this.catalogo() !== 'pronto') return null;
    const f = this.filtros();
    const [ano_inicio, ano_fim] = f.anos ?? this.limitesAnos();
    return {
      escola: this.escolaSelecionada(),
      recorte: {
        rede_ensino: f.redeMunicipio ? [f.redeMunicipio] : [],
        ano_inicio,
        ano_fim,
      },
    };
  });

  /** Incrementado por "Tentar novamente" para repetir a mesma consulta. */
  private readonly tentativa = signal(0);

  constructor() {
    toObservable(computed(() => ({ consulta: this.consulta(), tentativa: this.tentativa() })))
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap(({ consulta }) =>
          consulta?.escola
            ? this.carregarComparacao(consulta.escola, consulta.recorte)
            : of<EstadoComparacao>({ tipo: 'inicial' }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estado) => this.estado.set(estado));
  }

  ngOnInit(): void {
    this.carregarCatalogo();
  }

  protected carregarCatalogo(): void {
    this.catalogo.set('carregando');
    this.facade
      .listarEscolasParaBusca()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (escolas) => {
          this.escolas.set(escolas);
          this.carregarAnos();
        },
        error: () => this.catalogo.set('erro'),
      });
  }

  /** Anos da base para o slider; sem resposta, usa o período padrão da metodologia. */
  private carregarAnos(): void {
    this.facade
      .listarFiltros()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filtros) => {
        this.anosDisponiveis.set(anosDisponiveisDoCatalogo(filtros.anos, ANOS_PADRAO));
        this.catalogo.set('pronto');
      });
  }

  /** Mudança num campo: atualiza o rascunho e, fora do celular, aplica na hora. */
  protected alterar(parcial: Partial<FiltrosEscolaModel>): void {
    this.rascunho.update((r) => normalizarFiltrosEscola({ ...r, ...parcial }, this.escolas()));
    if (!this.telaCompacta()) this.aplicarRascunho();
  }

  /** Escolher uma escola leva o município dela para o filtro de município. */
  protected onEscolaChange(coEntidade: number | null): void {
    const escola = this.escolas().find((e) => e.co_entidade === coEntidade) ?? null;
    this.anoComposicao.set(null);
    this.alterar(
      escola
        ? { escola: escola.co_entidade, municipio: escola.municipio ?? this.rascunho().municipio }
        : { escola: null },
    );
  }

  protected onAnosChange(anos: AppRangeValue): void {
    this.anoComposicao.set(null);
    const [min, max] = this.limitesAnos();
    this.alterar({ anos: anos[0] === min && anos[1] === max ? null : anos });
  }

  protected aplicarRascunho(): void {
    this.filtros.set(this.rascunho());
  }

  /** Abrir a gaveta parte dos filtros aplicados; fechar sem aplicar descarta o rascunho. */
  protected reiniciarRascunho(): void {
    this.rascunho.set(this.filtros());
  }

  protected onAnoComposicaoChange(ano: number): void {
    this.anoComposicao.set(ano);
  }

  protected tentarNovamente(): void {
    if (this.catalogo() === 'erro') {
      this.carregarCatalogo();
      return;
    }
    this.tentativa.update((n) => n + 1);
  }

  private carregarComparacao(
    escola: EscolaBuscaModel,
    recorte: RecorteTemporalModel,
  ): Observable<EstadoComparacao> {
    return this.facade.obterComparacaoEscolaMunicipio(escola.co_entidade, recorte).pipe(
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
