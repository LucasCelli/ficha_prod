"use client";

import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type { KanbanBoardColumn, KanbanCardSummary } from "./data";
import { formatDateLong, getCloudinaryThumbnailUrl } from "./quadro-producao-state";

type CardDetailsModalProps = {
  card: KanbanCardSummary;
  columns: KanbanBoardColumn[];
  deliverPending: boolean;
  onClose: () => void;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
};

export function CardDetailsModal({
  card,
  columns,
  deliverPending,
  onClose,
  onDeliverCard,
  onMoveNextCard,
}: CardDetailsModalProps) {
  const currentColumnIndex = columns.findIndex((column) => column.id === card.kanbanColumnId);
  const isLastColumn = currentColumnIndex === columns.length - 1;
  const imageUrl = getCloudinaryThumbnailUrl(card.thumbUrl, 720, 405);

  return (
    <Modal onClose={onClose} size="lg" title={`Detalhes de ${card.clienteNome}`}>
      <div className="quadro-producao-view-modal">
        <div className="quadro-producao-view-modal__media">
          {imageUrl ? (
            <Image alt="" className="quadro-producao-view-modal__image" height={405} src={imageUrl} width={720} />
          ) : (
            <div className="quadro-producao-view-modal__image-placeholder">Sem imagem</div>
          )}
        </div>
        <div className="quadro-producao-view-modal__content">
          <header className="quadro-producao-view-modal__header">
            <h2>{card.clienteNome}</h2>
            <div className="quadro-producao-view-modal__tags">
              {card.evento ? <span className="quadro-producao-card__chip">Evento</span> : null}
              <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
            </div>
          </header>

          <dl className="quadro-producao-view-grid">
            <div>
              <dt>Entrega</dt>
              <dd>{formatDateLong(card.dataEntrega)}</dd>
            </div>
            <div>
              <dt>Tecido</dt>
              <dd>{card.material || "-"}</dd>
            </div>
            <div>
              <dt>Venda</dt>
              <dd>{card.numeroVenda || "-"}</dd>
            </div>
            <div>
              <dt>Vendedor</dt>
              <dd>{card.vendedor || "-"}</dd>
            </div>
          </dl>

          <div className="quadro-producao-view-modal__actions">
            {isLastColumn ? (
              <Button
                className="quadro-producao-view-modal__move quadro-producao-view-modal__move--deliver"
                disabled={deliverPending}
                onClick={() => onDeliverCard(card)}
                variant="secondary"
              >
                <Check aria-hidden="true" size={16} />
                Entregar
              </Button>
            ) : (
              <Button className="quadro-producao-view-modal__move" onClick={() => onMoveNextCard(card)} variant="secondary">
                <ArrowRight aria-hidden="true" size={16} />
                Proxima coluna
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
