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
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotlyComponent, PlotlyService } from 'angular-plotly.js';

import { AppSelectComponent } from '../../../../../shared/ui/select/app-select.component';
import { AppSelectOption } from '../../../../../shared/ui/select/app-select.types';
import { PaginaCabecalhoComponent } from '../../../components/pagina-cabecalho/pagina-cabecalho.component';
import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { EscolaBuscaModel } from '../../../models/infraestrutura.models';
import {
  ANOS_PROTOTIPO,
  AlvoComparacao,
  CenarioPrototipo,
  LIMITE_ALVOS,
  TipoAlvo,
  adicionarAlvo,
  escolasComCoberturaBaixa,
  formatarValor,
  idAlvo,
  montarFiguraMultipla,
  montarSeries,
  removerAlvo,
  temAlgumDado,
} from '../../../prototipos/comparacao-multipla.prototipo';

PlotlyService.setPlotly(PlotlyJS);

const CENARIOS: { valor: CenarioPrototipo; label: string }[] = [
  { valor: 'dados', label: 'Com dados' },
  { valor: 'carregando', label: 'Carregando' },
  { valor: 'erro', label: 'Erro' },
  { valor: 'sem_dados', label: 'Sem dados' },
  { valor: 'baixa_cobertura', label: 'Baixa cobertura' },
];

/** Código fictício e estável para o município (o catálogo local só tem o nome). */
function codigoMunicipio(nome: string): number {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1_500_000 + (h % 99_999);
}

/**
 * FE11 — protótipo de descoberta do seletor e do gráfico da comparação múltipla.
 * Usa só o catálogo local de escolas e valores fictícios; não chama a API de comparação.
 */
@Component({
  selector: 'app-comparacao-multipla-page',
  standalone: true,
  imports: [FormsModule, AppSelectComponent, PaginaCabecalhoComponent, PlotlyComponent],
  templateUrl: './comparacao-multipla-page.component.html',
  styleUrl: './comparacao-multipla-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparacaoMultiplaPageComponent implements OnInit {
  private readonly facade = inject(InfraestruturaFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly limite = LIMITE_ALVOS;
  protected readonly anos = ANOS_PROTOTIPO;
  protected readonly cenarios = CENARIOS;
  protected readonly formatarValor = formatarValor;
  protected readonly idAlvo = idAlvo;
  protected readonly config = { displayModeBar: false, responsive: true };

  private readonly escolas = signal<EscolaBuscaModel[]>([]);
  protected readonly catalogoPronto = signal(false);

  protected readonly tipo = signal<TipoAlvo>('municipio');
  protected readonly candidato = signal<string | null>(null);
  protected readonly alvos = signal<AlvoComparacao[]>([]);
  protected readonly cenario = signal<CenarioPrototipo>('dados');
  /** Mensagem do último bloqueio (limite ou duplicado). */
  protected readonly aviso = signal<string | null>(null);

  protected readonly limiteAtingido = computed(() => this.alvos().length >= LIMITE_ALVOS);

  private readonly catalogo = computed<AlvoComparacao[]>(() => {
    if (this.tipo() === 'escola') {
      return this.escolas().map((e) => ({
        tipo: 'escola',
        codigo: e.co_entidade,
        nome: e.nome,
        municipio: e.municipio,
      }));
    }
    const nomes = [
      ...new Set(
        this.escolas()
          .map((e) => e.municipio)
          .filter((m): m is string => !!m),
      ),
    ];
    return nomes
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((nome) => ({ tipo: 'municipio', codigo: codigoMunicipio(nome), nome }));
  });

  protected readonly opcoes = computed<AppSelectOption<string>[]>(() => {
    const escolhidos = new Set(this.alvos().map(idAlvo));
    return this.catalogo().map((a) => ({
      label: a.nome,
      value: idAlvo(a),
      description:
        a.tipo === 'escola'
          ? `${a.municipio ?? 'Município não informado'} · INEP ${a.codigo}`
          : undefined,
      disabled: escolhidos.has(idAlvo(a)),
    }));
  });

  protected readonly series = computed(() => montarSeries(this.alvos(), this.cenario()));
  protected readonly figura = computed(() => montarFiguraMultipla(this.series()));
  protected readonly coberturaBaixa = computed(() => escolasComCoberturaBaixa(this.series()));

  /** Estado do card do gráfico, derivado da seleção e do cenário simulado. */
  protected readonly estadoGrafico = computed(() => {
    if (this.alvos().length === 0) return 'vazio';
    const c = this.cenario();
    if (c === 'carregando' || c === 'erro') return c;
    return temAlgumDado(this.series()) ? 'dados' : 'sem_dados';
  });

  ngOnInit(): void {
    this.facade
      .listarEscolasParaBusca()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (escolas) => {
          this.escolas.set(escolas);
          this.catalogoPronto.set(true);
        },
        error: () => this.catalogoPronto.set(true),
      });
  }

  protected definirTipo(tipo: TipoAlvo): void {
    this.tipo.set(tipo);
    this.candidato.set(null);
  }

  protected adicionar(): void {
    const alvo = this.catalogo().find((a) => idAlvo(a) === this.candidato());
    if (!alvo) return;
    const resultado = adicionarAlvo(this.alvos(), alvo);
    if (resultado.ok) {
      this.alvos.set(resultado.alvos);
      this.candidato.set(null);
      this.aviso.set(
        resultado.alvos.length >= LIMITE_ALVOS
          ? `Limite de ${LIMITE_ALVOS} seleções atingido. Remova um item para incluir outro.`
          : null,
      );
    } else {
      this.aviso.set(
        resultado.motivo === 'limite'
          ? `Você pode comparar no máximo ${LIMITE_ALVOS} escolas ou municípios.`
          : `${alvo.nome} já está na comparação.`,
      );
    }
  }

  protected remover(id: string): void {
    this.alvos.set(removerAlvo(this.alvos(), id));
    this.aviso.set(null);
  }

  protected limpar(): void {
    this.alvos.set([]);
    this.candidato.set(null);
    this.aviso.set(null);
  }
}
