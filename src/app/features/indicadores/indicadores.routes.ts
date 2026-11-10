import { Routes } from '@angular/router';

export const indicadoresRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/indicadores-home-page/indicadores-home-page.component').then(
        (m) => m.IndicadoresHomePageComponent,
      ),
  },
  {
    path: 'acessibilidade',
    loadComponent: () =>
      import('./pages/acessibilidade-page/acessibilidade-page.component').then(
        (m) => m.AcessibilidadePageComponent,
      ),
  },
  {
    path: 'acessibilidade/visao-geral',
    loadComponent: () =>
      import('./pages/acessibilidade/visao-geral-page/visao-geral-page.component').then(
        (m) => m.VisaoGeralPageComponent,
      ),
  },
  {
    path: 'acessibilidade/analise-temporal',
    loadComponent: () =>
      import('./pages/acessibilidade/analise-temporal-page/analise-temporal-page.component').then(
        (m) => m.AnaliseTemporalPageComponent,
      ),
  },
  {
    path: 'acessibilidade/escolas',
    loadComponent: () =>
      import('./pages/acessibilidade/escolas-page/escolas-page.component').then(
        (m) => m.EscolasPageComponent,
      ),
  },
  {
    path: 'acessibilidade/escolas/:id',
    loadComponent: () =>
      import('./pages/acessibilidade/escola-detalhe-page/escola-detalhe-page.component').then(
        (m) => m.EscolaDetalhePageComponent,
      ),
  },
  {
    path: 'conectividade',
    loadComponent: () =>
      import('./pages/conectividade-page/conectividade-page.component').then(
        (m) => m.ConectividadePageComponent,
      ),
  },
  {
    path: 'conectividade/visao-geral',
    loadComponent: () =>
      import('./pages/conectividade/visao-geral-page/visao-geral-page.component').then(
        (m) => m.VisaoGeralPageComponent,
      ),
  },
  {
    path: 'conectividade/analise-temporal',
    loadComponent: () =>
      import('./pages/conectividade/analise-temporal-page/analise-temporal-page.component').then(
        (m) => m.AnaliseTemporalPageComponent,
      ),
  },
  {
    path: 'conectividade/escolas',
    loadComponent: () =>
      import('./pages/conectividade/escolas-page/escolas-page.component').then(
        (m) => m.EscolasPageComponent,
      ),
  },
  {
    path: 'conectividade/escolas/:id',
    loadComponent: () =>
      import('./pages/conectividade/escola-detalhe-page/escola-detalhe-page.component').then(
        (m) => m.EscolaDetalhePageComponent,
      ),
  },
  {
    path: 'infraestrutura',
    loadComponent: () =>
      import('./pages/infraestrutura-page/infraestrutura-page.component').then(
        (m) => m.InfraestruturaPageComponent,
      ),
  },
  {
    path: 'infraestrutura/visao-geral',
    loadComponent: () =>
      import('./pages/infraestrutura/visao-geral-page/visao-geral-page.component').then(
        (m) => m.VisaoGeralPageComponent,
      ),
  },
  {
    path: 'infraestrutura/analise-temporal',
    loadComponent: () =>
      import('./pages/infraestrutura/analise-temporal-page/analise-temporal-page.component').then(
        (m) => m.AnaliseTemporalPageComponent,
      ),
  },
  {
    // FE11: protótipo de descoberta com dados fictícios; propositalmente fora do menu.
    path: 'infraestrutura/comparacao-multipla',
    loadComponent: () =>
      import('./pages/infraestrutura/comparacao-multipla-page/comparacao-multipla-page.component').then(
        (m) => m.ComparacaoMultiplaPageComponent,
      ),
  },
  {
    path: 'infraestrutura/escolas',
    loadComponent: () =>
      import('./pages/infraestrutura/escolas-page/escolas-page.component').then(
        (m) => m.EscolasPageComponent,
      ),
  },
  {
    path: 'infraestrutura/escolas/:id',
    loadComponent: () =>
      import('./pages/infraestrutura/escola-detalhe-page/escola-detalhe-page.component').then(
        (m) => m.EscolaDetalhePageComponent,
      ),
  },
];
