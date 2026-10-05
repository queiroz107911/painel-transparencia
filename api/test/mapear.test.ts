import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mapearContratacao, type ItemApi } from '../src/mapear.js';

const require = createRequire(import.meta.url);
const fixture = require('./fixtures/contratacoes.json') as { data: ItemApi[] };

describe('mapearContratacao', () => {
  it('mapeia campos obrigatórios do primeiro item', () => {
    const result = mapearContratacao(fixture.data[0]!);
    expect(result.numeroControlePncp).toBe('01612441000107-1-000131/2026');
    expect(result.orgaoCnpj).toBe('01612441000107');
    expect(result.orgaoRazaoSocial).toBe('MUNICIPIO DE BELA VISTA DO CAROBA');
    expect(result.modalidadeCodigo).toBe(6);
    expect(result.modalidadeNome).toBe('Pregão - Eletrônico');
  });

  it('mapeia uf a partir de unidadeOrgao.ufSigla', () => {
    const result = mapearContratacao(fixture.data[0]!);
    expect(result.uf).toBe('PR');
  });

  it('retorna null quando unidadeOrgao está ausente', () => {
    const item: ItemApi = { ...fixture.data[0]!, unidadeOrgao: undefined };
    expect(mapearContratacao(item).uf).toBeNull();
  });

  it('retorna null para campos opcionais ausentes', () => {
    const item: ItemApi = {
      ...fixture.data[0]!,
      objetoCompra: undefined,
      valorTotalEstimado: undefined,
      situacaoCompraNome: undefined,
      modalidadeNome: undefined,
    };
    const result = mapearContratacao(item);
    expect(result.objeto).toBeNull();
    expect(result.valorTotalEstimado).toBeNull();
    expect(result.situacao).toBeNull();
    expect(result.modalidadeNome).toBeNull();
  });

  it('mapeia todos os 10 itens da fixture sem lançar erro', () => {
    const resultados = fixture.data.map(mapearContratacao);
    expect(resultados).toHaveLength(10);
    for (const r of resultados) {
      expect(r.numeroControlePncp).toBeTruthy();
      expect(r.orgaoCnpj).toBeTruthy();
      expect(r.modalidadeCodigo).toBeTypeOf('number');
    }
  });

  it('mapeia item com situação "Revogada"', () => {
    const revogado = fixture.data.find(
      (item) => item.situacaoCompraNome === 'Revogada',
    );
    expect(revogado).toBeDefined();
    const result = mapearContratacao(revogado!);
    expect(result.situacao).toBe('Revogada');
  });
});
