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

import { AppButtonComponent } from '../../../../../shared/ui/button/app-button.component';
import { AppMultiSelectComponent } from '../../../../../shared/ui/multi-select/app-multi-select.component';
import { AppRangeSliderComponent } from '../../../../../shared/ui/range-slider/app-range-slider.component';
import { AppRangeValue } from '../../../../../shared/ui/range-slider/app-range-slider.types';
import { AppSelectComponent } from '../../../../../shared/ui/select/app-select.component';
import { AppSelectOption } from '../../../../../shared/ui/select/app-select.types';
import { AbasAnaliseTemporalComponent } from '../../../components/abas-analise-temporal/abas-analise-temporal.component';
import { CoberturaAnosComponent } from '../../../components/cobertura-anos/cobertura-anos.component';
import {
  ComparacaoGraficoComponent,
  ItemLegendaGrafico,
} from '../../../components/comparacao-grafico/comparacao-grafico.component';
import { ComparacaoResumoComponent } from '../../../components/comparacao-resumo/comparacao-resumo.component';
import { FiltrosAnaliseComponent } from '../../../components/filtros-analise/filtros-analise.component';
import { PaginaCabecalhoComponent } from '../../../components/pagina-cabecalho/pagina-cabecalho.component';
import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import {
  INDICADORES_METODOLOGIA,
  LABELS_INDICADORES,
  TEXTOS_COMPARACAO,
} from '../../../mappers/comparacao-grafico.mapper';
import {
  ClassificacaoSerieMunicipio,
  FILTROS_MUNICIPIO_PADRAO,
  FiltrosMunicipioModel,
  TEXTOS_MUNICIPIO,
  TOTAL_INDICADORES,
  classificarSerieMunicipio,
  montarCartaoAno,
  montarCartoesAnoVazios,
  montarFiguraMunicipio,
  montarResumoMunicipio,
  prepararSerieMunicipio,
  resumoFiltrosMunicipio,
} from '../../../mappers/visao-municipio.mapper';
import {
  ErroComparacaoMunicipioModel,
  PontoMunicipioModel,
  REDES_ENSINO,
  RecorteMunicipioModel,
  RedeEnsinoModel,
  VisaoTemporalMunicipioModel,
} from '../../../models/infraestrutura.models';
import { injectTelaCompacta } from '../../../utils/tela-compacta';
import {
  ANOS_PADRAO,
  anosDisponiveisDoCatalogo,
  intervaloAnos,
} from '../analise-temporal-page/filtros-escola';

interface MunicipioOpcao {
  codigo: number;
  nome: string;
}

type EstadoVisao =
  | { tipo: 'inicial' }
  | { tipo: 'carregando' }
  | { tipo: 'erro'; erro: ErroComparacaoMunicipioModel }
  | {
      tipo: 'sucesso';
      visao: VisaoTemporalMunicipioModel;
      pontos: PontoMunicipioModel[];
      classificacao: ClassificacaoSerieMunicipio;
    };

type EstadoCatalogo = 'carregando' | 'pronto' | 'erro';

interface Consulta {
  municipio: number;
  recorte: RecorteMunicipioModel;
}

/** Erros em que tentar de novo pode resolver. */
const ERROS_RECUPERAVEIS = new Set([
  'internal_error',
  'warehouse_unavailable',
  'source_data_inconsistent',
  'network_error',
]);

const LEGENDA: readonly ItemLegendaGrafico[] = [
  { rotulo: TEXTOS_MUNICIPIO.serie, marca: 'escola' },
];

/**
 * Aba "Análise por Município" (REQ07 Frente 2, FE16): a cobertura média de infraestrutura
 * das escolas de um município, ano a ano, no recorte de rede, anos e indicadores escolhido.
 * Os filtros só valem depois de "Aplicar".
 */
@Component({
  selector: 'app-visao-municipio-page',
  standalone: true,
  imports: [
    FormsModule,
    AppButtonComponent,
    AppMultiSelectComponent,
    AppRangeSliderComponent,
    AppSelectComponent,
    AbasAnaliseTemporalComponent,
    CoberturaAnosComponent,
    ComparacaoGraficoComponent,
    ComparacaoResumoComponent,
    FiltrosAnaliseComponent,
    PaginaCabecalhoComponent,
  ],
  templateUrl: './visao-municipio-page.component.html',
  styleUrl: '../analise-temporal-page/analise-temporal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaoMunicipioPageComponent implements OnInit {
  private readonly facade = inject(InfraestruturaFacade);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly textos = TEXTOS_MUNICIPIO;
  protected readonly legenda = LEGENDA;
  protected readonly telaCompacta = injectTelaCompacta();

  protected readonly municipios = signal<MunicipioOpcao[]>([]);
  protected readonly catalogo = signal<EstadoCatalogo>('carregando');
  protected readonly anosDisponiveis = signal<readonly number[]>([]);

  /** Filtros aplicados (consultados na API). */
  protected readonly filtros = signal<FiltrosMunicipioModel>(FILTROS_MUNICIPIO_PADRAO);
  /** Filtros em edição; viram consulta só em "Aplicar". */
  protected readonly rascunho = signal<FiltrosMunicipioModel>(FILTROS_MUNICIPIO_PADRAO);
  protected readonly estado = signal<EstadoVisao>({ tipo: 'inicial' });

  protected readonly limitesAnos = computed(() => intervaloAnos(this.anosDisponiveis()));
  private readonly intervaloAplicado = computed<AppRangeValue>(
    () => this.filtros().anos ?? this.limitesAnos(),
  );

  protected readonly opcoesMunicipio = computed<AppSelectOption<number>[]>(() =>
    this.municipios().map((m) => ({ label: m.nome, value: m.codigo })),
  );
  protected readonly opcoesRede: AppSelectOption<RedeEnsinoModel>[] = REDES_ENSINO.map((r) => ({
    label: r,
    value: r,
  }));
  protected readonly opcoesIndicadores: AppSelectOption<string>[] = INDICADORES_METODOLOGIA.map(
    (chave) => ({ label: LABELS_INDICADORES[chave] ?? chave, value: chave }),
  );
  protected readonly resumoIndicadores = computed(() =>
    this.textos.filtros.indicadoresResumo(this.rascunho().indicadores.length, TOTAL_INDICADORES),
  );

  /** "Aplicar" exige um município e ao menos um indicador (REQ07 §3.2). */
  protected readonly aplicarDesabilitado = computed(() => {
    const r = this.rascunho();
    return this.catalogo() !== 'pronto' || r.municipio === null || r.indicadores.length === 0;
  });
  protected readonly erroIndicadores = computed(() =>
    this.rascunho().indicadores.length === 0 ? 'Selecione no mínimo 1 indicador.' : '',
  );

  private readonly nomeMunicipio = computed(() => {
    const e = this.estado();
    if (e.tipo === 'sucesso') return e.visao.municipio.no_municipio;
    const codigo = this.filtros().municipio;
    return this.municipios().find((m) => m.codigo === codigo)?.nome ?? null;
  });

  protected readonly resumoFiltros = computed(() =>
    resumoFiltrosMunicipio(
      this.filtros(),
      this.filtros().municipio === null ? null : this.nomeMunicipio(),
      this.limitesAnos(),
    ),
  );

  protected readonly carregando = computed(() => this.estado().tipo === 'carregando');
  protected readonly dicaGrafico = computed(() =>
    this.telaCompacta() ? TEXTOS_COMPARACAO.dicaGraficoToque : TEXTOS_COMPARACAO.dicaGrafico,
  );

  protected readonly figura = computed(() => {
    const e = this.estado();
    return e.tipo === 'sucesso' && e.classificacao === 'com_dados'
      ? montarFiguraMunicipio(e.pontos)
      : null;
  });

  protected readonly mensagemGrafico = computed(() => {
    const e = this.estado();
    if (this.catalogo() === 'erro') return 'Não foi possível carregar a lista de municípios.';
    if (e.tipo === 'erro') return e.erro.mensagem;
    if (e.tipo === 'sucesso') {
      if (e.classificacao === 'denominador_zero') return this.textos.denominadorZero;
      if (e.classificacao === 'sem_dados') return this.textos.semDados;
      return null;
    }
    return this.textos.inicial;
  });
  protected readonly erroGrafico = computed(
    () => this.catalogo() === 'erro' || this.estado().tipo === 'erro',
  );
  protected readonly acaoGrafico = computed(() => {
    const e = this.estado();
    if (this.catalogo() === 'erro') return 'Tentar novamente';
    return e.tipo === 'erro' && ERROS_RECUPERAVEIS.has(e.erro.codigo) ? 'Tentar novamente' : null;
  });

  /** Último ano do intervalo, mesmo que sem dados (REQ07 §3.3). */
  private readonly pontoResumo = computed(() => {
    const e = this.estado();
    return e.tipo === 'sucesso' ? (e.pontos.at(-1) ?? null) : null;
  });
  protected readonly resumoItens = computed(() =>
    montarResumoMunicipio(
      this.pontoResumo(),
      this.nomeMunicipio(),
      this.filtros().indicadores.length,
    ),
  );
  /** O aviso do ano só aparece quando o ano tem cobertura calculada. */
  protected readonly avisoResumo = computed(() => {
    const ponto = this.pontoResumo();
    return ponto && ponto.cobertura_media_percentual !== null
      ? this.textos.resumoDoAno(ponto.ano)
      : '';
  });

  protected readonly cartoesAno = computed(() => {
    const e = this.estado();
    if (e.tipo === 'sucesso') return e.pontos.map(montarCartaoAno);
    return montarCartoesAnoVazios(
      this.intervaloAplicado(),
      e.tipo === 'inicial' ? this.textos.anos.selecione : null,
    );
  });
  protected readonly comoInterpretar = computed(() => {
    const e = this.estado();
    const t = this.textos.comoInterpretar;
    if (e.tipo === 'inicial') return t.textoSemDados;
    return e.tipo === 'sucesso' && e.pontos.some((p) => p.situacao === 'denominador_zero')
      ? t.texto
      : null;
  });

  /** Município e recorte da consulta; só muda quando algum valor de fato muda. */
  private readonly consulta = computed<Consulta | null>(() => {
    if (this.catalogo() !== 'pronto') return null;
    const f = this.filtros();
    if (f.municipio === null || f.indicadores.length === 0) return null;
    const [ano_inicio, ano_fim] = this.intervaloAplicado();
    return {
      municipio: f.municipio,
      recorte: {
        rede_ensino: f.rede ? [f.rede] : [],
        ano_inicio,
        ano_fim,
        indicadores: [...f.indicadores],
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
          consulta
            ? this.carregarVisao(consulta.municipio, consulta.recorte)
            : of<EstadoVisao>({ tipo: 'inicial' }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estado) => this.estado.set(estado));
  }

  ngOnInit(): void {
    this.carregarCatalogo();
  }

  /**
   * Municípios e anos vêm de `/filtros`; sem municípios na resposta, a lista é montada a
   * partir do catálogo de escolas.
   */
  protected carregarCatalogo(): void {
    this.catalogo.set('carregando');
    this.facade
      .listarFiltros()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dados) => {
        this.anosDisponiveis.set(anosDisponiveisDoCatalogo(dados.anos, ANOS_PADRAO));
        if (dados.municipios.length) {
          this.definirMunicipios(dados.municipios);
          return;
        }
        this.facade
          .listarEscolasParaBusca()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (escolas) =>
              this.definirMunicipios(
                escolas.flatMap((e) =>
                  e.codigoMunicipio !== null && e.municipio
                    ? [{ codigo: e.codigoMunicipio, nome: e.municipio }]
                    : [],
                ),
              ),
            error: () => this.catalogo.set('erro'),
          });
      });
  }

  private definirMunicipios(lista: readonly MunicipioOpcao[]): void {
    const unicos = new Map(lista.map((m) => [m.codigo, m]));
    this.municipios.set([...unicos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    this.catalogo.set(unicos.size ? 'pronto' : 'erro');
  }

  protected alterar(parcial: Partial<FiltrosMunicipioModel>): void {
    this.rascunho.update((r) => ({ ...r, ...parcial }));
  }

  protected onAnosChange(anos: AppRangeValue): void {
    const [min, max] = this.limitesAnos();
    this.alterar({ anos: anos[0] === min && anos[1] === max ? null : anos });
  }

  protected aplicar(): void {
    if (this.aplicarDesabilitado()) return;
    this.filtros.set(this.rascunho());
  }

  /** "Limpar": volta aos filtros padrão e ao estado inicial. */
  protected limpar(): void {
    this.rascunho.set(FILTROS_MUNICIPIO_PADRAO);
    this.filtros.set(FILTROS_MUNICIPIO_PADRAO);
  }

  /** Abrir a gaveta parte dos filtros aplicados; fechar sem aplicar descarta o rascunho. */
  protected reiniciarRascunho(): void {
    this.rascunho.set(this.filtros());
  }

  protected tentarNovamente(): void {
    if (this.catalogo() === 'erro') {
      this.carregarCatalogo();
      return;
    }
    this.tentativa.update((n) => n + 1);
  }

  private carregarVisao(
    municipio: number,
    recorte: RecorteMunicipioModel,
  ): Observable<EstadoVisao> {
    return this.facade.obterVisaoTemporalMunicipio(municipio, recorte).pipe(
      map((visao): EstadoVisao => {
        const pontos = prepararSerieMunicipio(visao.serie, [recorte.ano_inicio, recorte.ano_fim]);
        return { tipo: 'sucesso', visao, pontos, classificacao: classificarSerieMunicipio(pontos) };
      }),
      catchError((erro: ErroComparacaoMunicipioModel) => of<EstadoVisao>({ tipo: 'erro', erro })),
      startWith<EstadoVisao>({ tipo: 'carregando' }),
    );
  }
}
