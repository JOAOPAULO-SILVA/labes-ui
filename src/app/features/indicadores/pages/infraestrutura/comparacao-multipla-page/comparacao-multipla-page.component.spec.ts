import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { InfraestruturaFacade } from '../../../facades/infraestrutura.facade';
import { EscolaBuscaModel } from '../../../models/infraestrutura.models';
import { ComparacaoMultiplaPageComponent } from './comparacao-multipla-page.component';

const escola = (co: number, nome: string, municipio: string): EscolaBuscaModel => ({
  co_entidade: co,
  nome,
  municipio,
  dependencia: null,
  localizacao: null,
});
const ESCOLAS = [
  escola(15000001, 'EMEF A', 'Belém'),
  escola(15000002, 'EMEF B', 'Ananindeua'),
  escola(15000003, 'EMEF C', 'Castanhal'),
  escola(15000004, 'EMEF D', 'Marabá'),
];

describe('ComparacaoMultiplaPageComponent (FE11, protótipo)', () => {
  let fixture: ComponentFixture<ComparacaoMultiplaPageComponent>;
  const pagina = () =>
    fixture.componentInstance as unknown as {
      definirTipo(t: 'escola' | 'municipio'): void;
      candidato: { set(v: string | null): void };
      opcoes(): { value: string; disabled?: boolean }[];
      adicionar(): void;
      limpar(): void;
      cenario: { set(v: string): void };
    };
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const chips = () => (fixture.nativeElement as HTMLElement).querySelectorAll('.chip');
  const adicionar = (id: string) => {
    pagina().candidato.set(id);
    pagina().adicionar();
    fixture.detectChanges();
  };
  const idMunicipio = (i: number) => pagina().opcoes()[i].value;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ComparacaoMultiplaPageComponent],
      providers: [
        provideRouter([]),
        { provide: InfraestruturaFacade, useValue: { listarEscolasParaBusca: () => of(ESCOLAS) } },
      ],
    });
    fixture = TestBed.createComponent(ComparacaoMultiplaPageComponent);
    fixture.detectChanges();
  });

  it('deixa claro que é protótipo com dados fictícios e sem integração', () => {
    expect(texto()).toContain('Protótipo de descoberta (FE11)');
    expect(texto()).toContain('fictícios');
    expect(texto()).toContain('a integração com a API não foi implementada');
    expect(texto()).toContain('Selecione até três escolas ou municípios');
  });

  it('adiciona, impede duplicado na lista e mostra o aviso de limite no terceiro', () => {
    adicionar(idMunicipio(0));
    expect(pagina().opcoes()[0].disabled).toBe(true);
    adicionar(idMunicipio(1));
    pagina().definirTipo('escola');
    adicionar('escola:15000001');

    expect(chips()).toHaveLength(3);
    expect(texto()).toContain('3 de 3 selecionados');
    expect(texto()).toContain('Limite de 3 seleções atingido');
    expect(texto()).toContain('+ referência de Belém');
  });

  it('remove um item pelo botão e limpa todos', () => {
    adicionar(idMunicipio(0));
    adicionar(idMunicipio(1));
    const remover = fixture.nativeElement.querySelector('.chip__remover') as HTMLButtonElement;
    expect(remover.getAttribute('aria-label')).toMatch(/^Remover /);
    remover.click();
    fixture.detectChanges();
    expect(chips()).toHaveLength(1);

    pagina().limpar();
    fixture.detectChanges();
    expect(chips()).toHaveLength(0);
    expect(texto()).toContain('Selecione até três escolas ou municípios');
  });

  it('simula os estados de erro, sem dados e baixa cobertura', () => {
    pagina().definirTipo('escola');
    adicionar('escola:15000002');

    pagina().cenario.set('erro');
    fixture.detectChanges();
    expect(texto()).toContain('Não foi possível carregar a comparação.');

    pagina().cenario.set('sem_dados');
    fixture.detectChanges();
    expect(texto()).toContain('Não existem dados de infraestrutura suficientes');

    pagina().cenario.set('baixa_cobertura');
    fixture.detectChanges();
    expect(texto()).toContain('Cobertura baixa:');
    expect(texto()).toContain('A linha continua exibida.');
  });
});
