import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Copy, Edit, Image as ImageIcon, PackageOpen, Ruler, Shirt, Tag, UserRound, type LucideIcon } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import { getFichaById, type FichaDetail, type FichaStatus } from "./data";

const statusTones: Record<FichaStatus, "danger" | "success" | "warning"> = {
  cancelado: "danger",
  entregue: "success",
  pendente: "warning",
};

const statusLabels: Record<FichaStatus, string> = {
  cancelado: "Cancelado",
  entregue: "Entregue",
  pendente: "Pendente",
};

export async function FichaPreview({ id }: { id: string }) {
  const result = await getFichaById(id);

  if (result.kind === "error" || result.kind === "not-found" || result.kind === "not-configured") {
    return (
      <div className="ficha-preview ficha-preview--empty">
        <EmptyState title="Erro ao carregar ficha" description="Não foi possível exibir a prévia desta ficha." />
      </div>
    );
  }

  const ficha = result.ficha;

  if (!ficha) return null;

  const mainImage = ficha.imagens[0];
  const technicalGroups = getTechnicalGroups(ficha);

  return (
    <article className="ficha-preview" aria-labelledby="ficha-preview-title">
      <header className="ficha-preview__header">
        <div className="ficha-preview__heading">
          <Badge tone="neutral">Prévia</Badge>
          <h2 id="ficha-preview-title">{ficha.cliente_nome_snapshot}</h2>
          <p>{ficha.numero_venda ? `Venda ${ficha.numero_venda}` : "Sem venda vinculada"}</p>
        </div>

        <div className="ficha-preview__header-actions">
          <Badge tone={statusTones[ficha.status]}>{statusLabels[ficha.status]}</Badge>
          {ficha.evento ? <Badge tone="info">Evento</Badge> : null}
          <Link className="ui-button ui-button--secondary" href={`/fichas/nova?duplicar=${encodeURIComponent(ficha.id)}`}>
            <Copy aria-hidden="true" size={16} />
            Duplicar
          </Link>
          <Link className="ui-button ui-button--primary" href={`/fichas/${ficha.id}`}>
            <Edit aria-hidden="true" size={16} />
            Editar
          </Link>
        </div>
      </header>

      <div className="ficha-preview__summary" aria-label="Resumo da ficha">
        <PreviewMetric icon={CalendarDays} label="Início" value={formatDate(ficha.data_inicio)} />
        <PreviewMetric icon={CalendarDays} label="Entrega" value={formatDate(ficha.data_entrega)} />
        <PreviewMetric icon={UserRound} label="Responsável" value={ficha.vendedor || "Não atribuído"} />
        <PreviewMetric icon={Tag} label="Personalização" value={normalizePersonalizacaoLabel(ficha.arte)} />
      </div>

      <div className="ficha-preview__layout">
        <aside className="ficha-preview__media" aria-label="Arte e imagens do produto">
          <div className="ficha-preview__main-image">
            {mainImage ? (
              <Image src={mainImage.url} alt={mainImage.alt_text || "Imagem principal da ficha"} fill className="ficha-preview__image" unoptimized />
            ) : (
              <div className="ficha-preview__no-image">
                <ImageIcon aria-hidden="true" size={32} />
                <span>Nenhuma imagem</span>
              </div>
            )}
          </div>

          {ficha.imagens.length > 1 ? (
            <div className="ficha-preview__thumbs" aria-label="Outras imagens">
              {ficha.imagens.slice(1, 5).map((img) => (
                <a href={img.url} target="_blank" rel="noreferrer" key={img.id} className="ficha-preview__thumb-link">
                  <Image src={img.url} alt={img.alt_text || "Imagem da ficha"} fill className="ficha-preview__image" unoptimized />
                </a>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="ficha-preview__content">
          <section className="ficha-preview__panel" aria-labelledby="preview-products-title">
            <PreviewSectionTitle icon={PackageOpen} id="preview-products-title" title="Produtos" />
            {ficha.itens.length > 0 ? (
              <div className="ficha-preview__table-wrapper">
                <table className="ficha-preview__table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Tamanho</th>
                      <th>Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.itens.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.produto || "Padrão"}</strong>
                          {item.detalhes_produto ? <span>{item.detalhes_produto}</span> : null}
                        </td>
                        <td>{item.tamanho || "Padrão"}</td>
                        <td>{formatNumber(item.quantidade)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ficha-preview__empty">Nenhum produto cadastrado.</p>
            )}
          </section>

          <section className="ficha-preview__panel" aria-labelledby="preview-technical-title">
            <PreviewSectionTitle icon={Shirt} id="preview-technical-title" title="Especificações técnicas" />
            <div className="ficha-preview__technical-grid">
              {technicalGroups.map((item) => (
                <div className="ficha-preview__technical-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          {ficha.observacoes ? (
            <section className="ficha-preview__panel" aria-labelledby="preview-notes-title">
              <PreviewSectionTitle icon={Ruler} id="preview-notes-title" title="Observações" />
              <p className="ficha-preview__notes">{ficha.observacoes}</p>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PreviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="ficha-preview__metric">
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PreviewSectionTitle({
  icon: Icon,
  id,
  title,
}: {
  icon: LucideIcon;
  id: string;
  title: string;
}) {
  return (
    <h3 id={id} className="ficha-preview__section-title">
      <Icon aria-hidden="true" size={18} />
      {title}
    </h3>
  );
}

function getTechnicalGroups(ficha: FichaDetail) {
  return [
    { label: "Material", value: ficha.material },
    { label: "Cor do material", value: ficha.cor_material },
    { label: "Composição", value: ficha.composicao },
    { label: "Manga", value: joinValues(ficha.manga, ficha.acabamento_manga) },
    { label: "Gola", value: joinValues(ficha.gola, ficha.acabamento_gola) },
    { label: "Bolso", value: ficha.bolso },
    { label: "Filete", value: joinValues(ficha.filete, ficha.filete_local, ficha.filete_cor) },
    { label: "Faixa refletiva", value: joinValues(ficha.faixa, ficha.faixa_local, ficha.faixa_cor) },
    { label: "Nomes / Números", value: ficha.com_nomes },
  ].map((item) => ({
    ...item,
    value: item.value || "Não informado",
  }));
}

function joinValues(...values: Array<null | string>) {
  return values.filter(Boolean).join(" · ");
}

function formatDate(value: null | string) {
  if (!value) return "Não definido";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
