import { PlotlyFigure } from '../../../core/api/models/plotly-figure';
import { GraficoApresentacao, GraficoListaModel } from '../models/indicadores.models';

/** Ajusta a figura do backend ao visual dos cards (fundo, fonte e margens). */
export function normalizarFiguraTemporal(figure: PlotlyFigure): PlotlyFigure {
  const layout = { ...(figure.layout ?? {}) };
  const originalMargin = (layout['margin'] ?? {}) as Record<string, unknown>;
  const hasIndicator = (figure.data ?? []).some((t) => t['type'] === 'indicator');
  const originalTopMargin = Number(originalMargin['t'] ?? 24);
  delete layout['title'];
  delete layout['margin'];
  delete layout['height'];
  delete layout['width'];
  return {
    ...figure,
    layout: {
      ...layout,
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        family: "Inter, 'Segoe UI', Roboto, Arial, sans-serif",
        color: '#26395f',
        size: 12,
        ...(layout['font'] ?? {}),
      },
      margin: {
        ...(originalMargin ?? {}),
        l: hasIndicator ? 20 : 58,
        r: 18,
        t: hasIndicator ? 12 : Math.min(originalTopMargin, 32),
        b: hasIndicator ? 24 : 58,
        pad: 0,
      },
    },
  };
}

export function mapGraficosAnaliseTemporal(lista: GraficoListaModel[]): GraficoApresentacao[] {
  return lista.map((g) => ({
    chave: g.chave,
    titulo: g.titulo,
    tipo: g.tipo,
    plotly: normalizarFiguraTemporal(g.plotly),
  }));
}
