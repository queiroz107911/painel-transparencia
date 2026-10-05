type ResumoOrgao = {
  cnpj: string;
  razaoSocial: string;
  uf: string | null;
  quantidade: number;
  valorTotal: number | null;
};

type ResumoModalidade = {
  modalidadeCodigo: number;
  modalidadeNome: string | null;
  quantidade: number;
  valorTotal: number | null;
};

type ResumoResp = { porOrgao: ResumoOrgao[]; porModalidade: ResumoModalidade[] };

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

function fmtValor(v: number | null): string {
  if (!v) return "R$ 0";
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toFixed(2)}`;
}

const LABEL_W = 220;
const CHART_W = 480;
const BAR_H = 28;
const GAP = 8;
const SVG_W = LABEL_W + CHART_W + 100;

function GraficoOrgaos({ orgaos }: { orgaos: ResumoOrgao[] }) {
  const top = orgaos.slice(0, 10);
  const max = Math.max(...top.map((o) => o.valorTotal ?? 0), 1);
  const svgH = top.length * (BAR_H + GAP) + 10;

  return (
    <div className="svg-wrap">
      <svg
        width={SVG_W}
        height={svgH}
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        role="img"
        aria-label="Valor contratado por órgão"
      >
        {top.map((o, i) => {
          const barW = ((o.valorTotal ?? 0) / max) * CHART_W;
          const y = i * (BAR_H + GAP);
          const label =
            o.razaoSocial.length > 30
              ? o.razaoSocial.slice(0, 28) + "…"
              : o.razaoSocial;
          return (
            <g key={o.cnpj}>
              <text
                x={LABEL_W - 6}
                y={y + BAR_H / 2 + 5}
                textAnchor="end"
                fontSize="12"
                fill="#333"
              >
                {label}
              </text>
              <rect
                x={LABEL_W}
                y={y}
                width={Math.max(barW, 1)}
                height={BAR_H}
                fill="#2563eb"
                rx="2"
              />
              <text
                x={LABEL_W + barW + 6}
                y={y + BAR_H / 2 + 5}
                fontSize="11"
                fill="#555"
              >
                {fmtValor(o.valorTotal)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GraficoModalidades({ modalidades }: { modalidades: ResumoModalidade[] }) {
  const max = Math.max(...modalidades.map((m) => m.valorTotal ?? 0), 1);
  const svgH = modalidades.length * (BAR_H + GAP) + 10;

  return (
    <div className="svg-wrap">
      <svg
        width={SVG_W}
        height={svgH}
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        role="img"
        aria-label="Valor contratado por modalidade"
      >
        {modalidades.map((m, i) => {
          const barW = ((m.valorTotal ?? 0) / max) * CHART_W;
          const y = i * (BAR_H + GAP);
          const label = m.modalidadeNome ?? `Modalidade ${m.modalidadeCodigo}`;
          return (
            <g key={m.modalidadeCodigo}>
              <text
                x={LABEL_W - 6}
                y={y + BAR_H / 2 + 5}
                textAnchor="end"
                fontSize="12"
                fill="#333"
              >
                {label.length > 30 ? label.slice(0, 28) + "…" : label}
              </text>
              <rect
                x={LABEL_W}
                y={y}
                width={Math.max(barW, 1)}
                height={BAR_H}
                fill="#059669"
                rx="2"
              />
              <text
                x={LABEL_W + barW + 6}
                y={y + BAR_H / 2 + 5}
                fontSize="11"
                fill="#555"
              >
                {fmtValor(m.valorTotal)} ({m.quantidade})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function ResumoPage() {
  const res = await fetch(`${API_URL}/contratacoes/resumo`, { cache: "no-store" });
  const data: ResumoResp = await res.json();

  const totalValor = data.porOrgao.reduce((s, o) => s + (o.valorTotal ?? 0), 0);
  const totalQtd = data.porOrgao.reduce((s, o) => s + o.quantidade, 0);

  return (
    <>
      <h1>Resumo por Órgão e Modalidade</h1>

      <div className="totais">
        <div className="stat">
          <div className="label">Contratações</div>
          <div className="value">{totalQtd.toLocaleString("pt-BR")}</div>
        </div>
        <div className="stat">
          <div className="label">Valor total estimado</div>
          <div className="value">{fmtValor(totalValor)}</div>
        </div>
        <div className="stat">
          <div className="label">Órgãos</div>
          <div className="value">{data.porOrgao.length}</div>
        </div>
      </div>

      <div className="resumo-grid">
        <div>
          <h2>Top 10 Órgãos por valor</h2>
          <GraficoOrgaos orgaos={data.porOrgao} />
        </div>
        <div>
          <h2>Por Modalidade</h2>
          <GraficoModalidades modalidades={data.porModalidade} />
        </div>
      </div>
    </>
  );
}
