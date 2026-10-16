import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, map, switchMap } from 'rxjs';

import { AppToastService } from '../../../../shared/ui/toast/app-toast.service';
import { IndicadoresChartsComponent } from '../charts/indicadores-charts.component';
import { EstadoCardComponent } from '../estado-card/estado-card.component';
import { mapGraficosAnaliseTemporal } from '../../mappers/analise-temporal.mapper';
import {
  FiltrosAnaliseTemporalModel,
  FonteAnaliseTemporal,
  GraficoApresentacao,
  MetricaFiltroModel,
} from '../../models/indicadores.models';

/**
 * Panorama agregado da análise temporal (Pará e redes de ensino), com filtro de
 * métrica e PIBID. Compartilhado pelas páginas de acessibilidade, conectividade
 * e infraestrutura; a página informa a facade como `fonte`.
 */
@Component({
  selector: 'app-analise-temporal-panorama',
  standalone: true,
  imports: [FormsModule, IndicadoresChartsComponent, EstadoCardComponent],
  templateUrl: './analise-temporal-panorama.component.html',
  styleUrl: './analise-temporal-panorama.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnaliseTemporalPanoramaComponent implements OnInit {
  readonly fonte = input.required<FonteAnaliseTemporal>();
  readonly metricaPadrao = input.required<string>();
  readonly titulo = input<string | null>(null);
  readonly descricao = input<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AppToastService);
  private readonly filtros$ = new Subject<FiltrosAnaliseTemporalModel>();
  private avisarAoConcluir = false;

  protected readonly metricas = signal<MetricaFiltroModel[]>([]);
  protected readonly graficos = signal<GraficoApresentacao[]>([]);
  protected readonly carregandoFiltros = signal(true);
  protected readonly carregandoGraficos = signal(false);

  protected selectedMetrica: string | null = null;
  protected selectedPibid: boolean | null = null;

  ngOnInit(): void {
    this.selectedMetrica = this.metricaPadrao();

    this.filtros$
      .pipe(
        switchMap((filtros) =>
          this.fonte()
            .listarAnaliseTemporal(filtros)
            .pipe(map((analise) => mapGraficosAnaliseTemporal(analise.listaGraficos))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((graficos) => {
        this.graficos.set(graficos);
        this.carregandoGraficos.set(false);
        if (this.avisarAoConcluir) {
          this.toast.success('Filtros aplicados com sucesso');
          this.avisarAoConcluir = false;
        }
      });

    this.fonte()
      .listarFiltros()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filtros) => {
        this.metricas.set(
          filtros.metricas.map((m) => ({ chave: String(m.chave), label: String(m.label) })),
        );
        this.carregandoFiltros.set(false);
        this.carregar();
      });
  }

  protected aplicarFiltros(): void {
    this.avisarAoConcluir = true;
    this.carregar();
  }

  protected resetFiltros(): void {
    this.selectedMetrica = this.metricaPadrao();
    this.selectedPibid = null;
    this.carregar();
  }

  protected onPibidChange(event: Event): void {
    this.selectedPibid = (event.target as HTMLInputElement).checked ? true : null;
  }

  /** Recarrega para o Plotly redimensionar os gráficos ao trocar grade/lista. */
  protected onLayoutChange(): void {
    this.carregar();
  }

  private carregar(): void {
    this.carregandoGraficos.set(true);
    this.filtros$.next({ metrica: this.selectedMetrica, pibid: this.selectedPibid });
  }
}
