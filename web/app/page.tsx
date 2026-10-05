type Filtros = {
  orgao?: string;
  modalidade?: string;
  de?: string;
  ate?: string;
  pagina?: string;
};

type ContratacaoComOrgao = {
  numeroControlePncp: string;
  modalidadeCodigo: number;
  modalidadeNome: string | null;
  objeto: string | null;
  valorTotalEstimado: number | null;
  dataPublicacao: string | null;
  situacao: string | null;
  orgaoCnpj: string;
  orgaoRazaoSocial: string;
  orgaoUf: string | null;
};

type ContratacoesResp = {
  dados: ContratacaoComOrgao[];
  total: number;
  pagina: number;
  tamanho: number;
};

type OrgaoRow = { cnpj: string; razaoSocial: string; uf: string | null };

const TAMANHO = 20;
const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v.trim() || undefined : undefined;
}

function fmtValor(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function badge(situacao: string | null): string {
  if (!situacao) return "badge-def";
  if (/revogad/i.test(situacao)) return "badge-rev";
  if (/divulgad/i.test(situacao)) return "badge-ok";
  return "badge-def";
}

function paginaUrl(filtros: Filtros, pagina: number): string {
  const qs = new URLSearchParams();
  if (filtros.orgao) qs.set("orgao", filtros.orgao);
  if (filtros.modalidade) qs.set("modalidade", filtros.modalidade);
  if (filtros.de) qs.set("de", filtros.de);
  if (filtros.ate) qs.set("ate", filtros.ate);
  qs.set("pagina", String(pagina));
  return `?${qs}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const filtros: Filtros = {
    orgao: str(params["orgao"]),
    modalidade: str(params["modalidade"]),
    de: str(params["de"]),
    ate: str(params["ate"]),
  };
  const paginaAtual = Math.max(1, Number(str(params["pagina"]) ?? "1"));

  const qs = new URLSearchParams();
  if (filtros.orgao) qs.set("orgao", filtros.orgao);
  if (filtros.modalidade) qs.set("modalidade", filtros.modalidade);
  if (filtros.de) qs.set("de", filtros.de);
  if (filtros.ate) qs.set("ate", filtros.ate);
  qs.set("pagina", String(paginaAtual));
  qs.set("tamanho", String(TAMANHO));

  const [contrRes, orgaosRes] = await Promise.all([
    fetch(`${API_URL}/contratacoes?${qs}`, { cache: "no-store" }),
    fetch(`${API_URL}/orgaos`, { cache: "no-store" }),
  ]);

  const data: ContratacoesResp = await contrRes.json();
  const orgaos: OrgaoRow[] = await orgaosRes.json();

  const totalPaginas = Math.ceil(data.total / TAMANHO);

  const paginasVisiveis = (): number[] => {
    const pages: number[] = [];
    const start = Math.max(1, paginaAtual - 2);
    const end = Math.min(totalPaginas, paginaAtual + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <>
      <h1>Contratações Públicas</h1>
      <p style={{ marginBottom: "1rem", color: "#555" }}>
        {data.total.toLocaleString("pt-BR")} contratações encontradas
      </p>

      {/* Filter form */}
      <form className="filtros" method="get" action="">
        <label>
          Órgão
          <select name="orgao" defaultValue={filtros.orgao ?? ""}>
            <option value="">Todos os órgãos</option>
            {orgaos.map((o) => (
              <option key={o.cnpj} value={o.cnpj}>
                {o.razaoSocial} {o.uf ? `(${o.uf})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Modalidade
          <input
            name="modalidade"
            type="number"
            min="1"
            placeholder="Ex: 6"
            defaultValue={filtros.modalidade ?? ""}
          />
        </label>
        <label>
          De
          <input name="de" type="date" defaultValue={filtros.de ?? ""} />
        </label>
        <label>
          Até
          <input name="ate" type="date" defaultValue={filtros.ate ?? ""} />
        </label>
        <button type="submit" className="btn">Filtrar</button>
        <a href="/" className="btn-limpar">Limpar</a>
      </form>

      {/* Table */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nº Controle</th>
              <th>Órgão</th>
              <th>Objeto</th>
              <th>Modalidade</th>
              <th>Valor estimado</th>
              <th>Publicação</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {data.dados.map((c) => (
              <tr key={c.numeroControlePncp}>
                <td style={{ fontFamily: "monospace", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {c.numeroControlePncp}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div>{c.orgaoRazaoSocial}</div>
                  {c.orgaoUf && <div style={{ color: "#888", fontSize: "12px" }}>{c.orgaoUf}</div>}
                </td>
                <td className="objeto-cell">
                  <span className="truncate" title={c.objeto ?? ""}>
                    {c.objeto ?? "—"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{c.modalidadeNome ?? c.modalidadeCodigo}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  {fmtValor(c.valorTotalEstimado)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{fmtData(c.dataPublicacao)}</td>
                <td>
                  <span className={`badge ${badge(c.situacao)}`}>
                    {c.situacao ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPaginas > 1 && (
        <nav className="paginacao" aria-label="Páginas">
          {paginaAtual > 1 && (
            <a href={paginaUrl(filtros, paginaAtual - 1)}>‹</a>
          )}
          {paginasVisiveis().map((p) =>
            p === paginaAtual ? (
              <span key={p} className="atual">{p}</span>
            ) : (
              <a key={p} href={paginaUrl(filtros, p)}>{p}</a>
            ),
          )}
          {paginaAtual < totalPaginas && (
            <a href={paginaUrl(filtros, paginaAtual + 1)}>›</a>
          )}
        </nav>
      )}
    </>
  );
}
