"use client";

import { useState } from "react";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  ChartFrame,
  CustomDatalist,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  FilterField,
  IconButton,
  LoadingBar,
  Modal,
  Pagination,
  SortableHandle,
  SortableInstructions,
  StatusPanel,
  Tooltip,
} from "@/components/ui";
import { Specimen } from "./showcase";
import styles from "./design-system.module.css";

export function ComponentGallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [order, setOrder] = useState(["Camiseta", "Regata", "Boné"]);

  function move(from: number, to: number) {
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div className={styles.gallery}>
      <section className={styles.galleryGroup}>
        <h3 className={styles.galleryGroupTitle}>Ações</h3>

        <Specimen
          code={`<Button variant="primary">Salvar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="ghost">Ver mais</Button>
<Button variant="danger">Excluir</Button>
<Button variant="warning">Reverter</Button>
<Button disabled>Indisponível</Button>`}
          dont="Para ação apenas com ícone, use IconButton: Button não garante rótulo acessível."
          name="Button"
          usage="Ação primária de um bloco. Apenas um primary por área de decisão."
        >
          <Button variant="primary">Salvar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver mais</Button>
          <Button variant="danger">Excluir</Button>
          <Button variant="warning">Reverter</Button>
          <Button disabled>Indisponível</Button>
        </Specimen>

        <Specimen
          code={`<IconButton label="Editar" size="sm"><Pencil size={16} /></IconButton>
<IconButton label="Duplicar" size="md" tone="primary"><Copy size={16} /></IconButton>
<IconButton label="Excluir" size="md" tone="danger"><Trash2 size={16} /></IconButton>
<IconButton label="Salvando" pending size="md" />`}
          dont="Não use com texto ao lado: nesse caso o componente é Button."
          name="IconButton"
          responsive="O tamanho visual é sm/md/lg, mas a área clicável vira 44px em pointer coarse."
          usage="Ação de linha ou de toolbar densa. O label é obrigatório e vira o Tooltip."
        >
          <IconButton label="Editar" size="sm">
            <Pencil aria-hidden="true" size={16} />
          </IconButton>
          <IconButton label="Duplicar" size="md" tone="primary">
            <Copy aria-hidden="true" size={16} />
          </IconButton>
          <IconButton label="Excluir" size="md" tone="danger">
            <Trash2 aria-hidden="true" size={16} />
          </IconButton>
          <IconButton label="Salvando" pending size="md">
            <Check aria-hidden="true" size={16} />
          </IconButton>
        </Specimen>
      </section>

      <section className={styles.galleryGroup}>
        <h3 className={styles.galleryGroupTitle}>Conteúdo e dados</h3>

        <Specimen
          code={`<Badge tone="neutral">Rascunho</Badge>
<Badge tone="info">Evento</Badge>
<Badge tone="success">Entregue</Badge>
<Badge tone="pending">Pendente</Badge>
<Badge tone="warning">Revisar</Badge>
<Badge tone="danger">Atrasada</Badge>`}
          dont="Não use como botão. Badge não é interativo."
          name="Badge"
          usage="Status e contagem. Sempre com texto: nunca apenas cor."
        >
          <Badge tone="neutral">Rascunho</Badge>
          <Badge tone="info">Evento</Badge>
          <Badge tone="success">Entregue</Badge>
          <Badge tone="pending">Pendente</Badge>
          <Badge tone="warning">Revisar</Badge>
          <Badge tone="danger">Atrasada</Badge>
        </Specimen>

        <Specimen
          code={`<Card>
  <h3>Título</h3>
  <p>Conteúdo</p>
</Card>`}
          name="Card"
          usage="Agrupar informação relacionada dentro de uma superfície elevada."
        >
          <Card>
            <h4 style={{ margin: 0 }}>Pedido 4821</h4>
            <p style={{ color: "var(--color-muted)", margin: "4px 0 0" }}>32 peças</p>
          </Card>
        </Specimen>

        <Specimen
          code={`<DataTable caption="Fichas" columns={columns} responsiveMode="cards">
  <tr><td data-label="Cliente">…</td></tr>
</DataTable>`}
          dont='responsiveMode="cards" exige data-label em cada td. Sem isso, use "scroll".'
          name="DataTable"
          responsive='Abaixo de 860px: "scroll" mantém as colunas roláveis; "cards" transforma cada linha em card.'
          usage="Listagem tabular. Escolha o modo responsivo conforme a densidade de colunas."
        >
          <div className={styles.previewStack}>
            <DataTable
              caption="Exemplo de tabela"
              columns={[
                { key: "cliente", label: "Cliente" },
                { key: "status", label: "Status" },
              ]}
              responsiveMode="cards"
            >
              <tr>
                <td data-label="Cliente">Loja Aurora</td>
                <td data-label="Status">
                  <Badge tone="success">Entregue</Badge>
                </td>
              </tr>
              <tr>
                <td data-label="Cliente">Colégio Vale</td>
                <td data-label="Status">
                  <Badge tone="pending">Pendente</Badge>
                </td>
              </tr>
            </DataTable>
          </div>
        </Specimen>

        <Specimen
          code={`<SortableHandle
  className="products-editor__drag"
  itemLabel={item.nome}
  onMove={(next) => move(index, next)}
  position={index + 1}
  total={items.length}
/>
<SortableInstructions />`}
          dont="Não use span com role=button: o handle precisa ser um button real."
          name="SortableHandle"
          usage="Reordenar listas com dnd-kit, incluindo ponteiro e teclado."
        >
          <div className={styles.previewStack}>
            <SortableInstructions />
            <ul data-sortable-list="" style={{ display: "grid", gap: 6, listStyle: "none", margin: 0, padding: 0 }}>
              {order.map((item, index) => (
                <li key={item} style={{ alignItems: "center", display: "flex", gap: 8 }}>
                  <SortableHandle
                    className="catalog-items-table__drag"
                    itemLabel={item}
                    onMove={(next) => move(index, next)}
                    position={index + 1}
                    total={order.length}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Specimen>

        <Specimen
          code={`<Pagination basePath="/fichas" currentPage={2} pageSize={30} totalItems={240} />`}
          name="Pagination"
          usage="Listagens paginadas. A página atual vive na URL."
        >
          <div className={styles.previewStack}>
            <Pagination basePath="#ds-componentes" currentPage={2} pageSize={30} totalItems={240} />
          </div>
        </Specimen>

        <Specimen
          code={`<ChartFrame categoryLabel="Dia" series={series} title="Fichas por dia">
  <ResponsiveContainer>…</ResponsiveContainer>
</ChartFrame>`}
          dont="Não confie em aria-label no container: séries e valores precisam da tabela."
          name="ChartFrame"
          usage="Toda visualização de dados. Gera a tabela alternativa lida por leitores de tela."
        >
          <div className={styles.previewStack}>
            <ChartFrame
              categoryLabel="Dia"
              legend={<span>Fichas criadas</span>}
              series={[
                {
                  label: "Fichas criadas",
                  points: [
                    { label: "Seg", value: 4 },
                    { label: "Ter", value: 7 },
                    { label: "Qua", value: 3 },
                  ],
                },
              ]}
              title="Exemplo de gráfico"
            >
              <div style={{ alignItems: "flex-end", display: "flex", gap: 8, height: 64 }}>
                {[4, 7, 3].map((value, index) => (
                  <span
                    key={index}
                    style={{
                      background: "var(--color-chart-1)",
                      borderRadius: "4px 4px 0 0",
                      height: `${value * 9}px`,
                      width: 28,
                    }}
                  />
                ))}
              </div>
            </ChartFrame>
          </div>
        </Specimen>
      </section>

      <section className={styles.galleryGroup}>
        <h3 className={styles.galleryGroupTitle}>Entrada e filtros</h3>

        <Specimen
          code={`<FilterBar label="Filtros de fichas">
  <FilterField htmlFor="ds-status" label="Status">
    <select id="ds-status">…</select>
  </FilterField>
  <FilterChip active href="?status=pendente">Pendentes</FilterChip>
</FilterBar>`}
          dont="Não use placeholder como único rótulo. O label é persistente."
          name="FilterBar / FilterField / FilterChip"
          responsive="Os controles quebram em várias linhas e sobem para 44px em pointer coarse."
          usage="Barra de filtros de listagem. O estado deve viver na URL."
        >
          <div className={styles.previewStack}>
            <FilterBar label="Filtros de exemplo">
              <FilterField htmlFor="ds-status" label="Status">
                <select defaultValue="todos" id="ds-status">
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendentes</option>
                </select>
              </FilterField>
              <FilterField htmlFor="ds-busca" label="Cliente">
                <input defaultValue="" id="ds-busca" placeholder="Buscar…" />
              </FilterField>
            </FilterBar>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <FilterChip active href="#ds-componentes">
                Todas
              </FilterChip>
              <FilterChip href="#ds-componentes">Pendentes</FilterChip>
              <FilterChip href="#ds-componentes">Atrasadas</FilterChip>
            </div>
          </div>
        </Specimen>

        <Specimen
          code={`<CustomDatalist id="material" options={options} placeholder="Material" />`}
          dont="Não torne as opções focáveis: o foco permanece no input."
          name="CustomDatalist"
          usage="Campo com sugestões. Combobox com aria-activedescendant e navegação por setas."
        >
          <div className={styles.previewStack}>
            <CustomDatalist
              aria-label="Material de exemplo"
              id="ds-datalist"
              options={[{ label: "Dry fit" }, { label: "Algodão" }, { label: "Poliéster" }]}
              placeholder="Material"
            />
          </div>
        </Specimen>
      </section>

      <section className={styles.galleryGroup}>
        <h3 className={styles.galleryGroupTitle}>Sobreposição e feedback</h3>

        <Specimen
          code={`<Modal onCloseHref="/clientes" size="md" title="Novo cliente">
  …
</Modal>`}
          dont="Não empilhe modais. Fluxos longos vão para rota própria."
          name="Modal"
          usage="Fluxo curto sobre a listagem, com estado refletido na URL (?modal=novo)."
        >
          <Button onClick={() => setModalOpen(true)} variant="secondary">
            Abrir modal
          </Button>
          {modalOpen ? (
            <Modal onClose={() => setModalOpen(false)} size="sm" title="Exemplo de modal">
              <div className="modal-form">
                <div className="modal-form__header">
                  <h2>Exemplo de modal</h2>
                </div>
                <Button onClick={() => setModalOpen(false)} variant="secondary">
                  Fechar
                </Button>
              </div>
            </Modal>
          ) : null}
        </Specimen>

        <Specimen
          code={`<Tooltip label="Reverter para pendente">
  <button aria-label="Reverter">…</button>
</Tooltip>`}
          dont='Nunca use title="" nativo: não funciona em toque e não é confiável.'
          name="Tooltip"
          usage="Descrever um controle icon-only ou revelar texto truncado."
        >
          <Tooltip label="Texto completo do rótulo truncado">
            <span style={{ borderBottom: "1px dashed var(--color-border)" }}>Passe o ponteiro aqui</span>
          </Tooltip>
        </Specimen>

        <Specimen
          code={`<EmptyState title="Nenhuma ficha encontrada" description="Ajuste os filtros." />`}
          dont="Não use para erro de carregamento: nesse caso use StatusPanel."
          name="EmptyState"
          usage="Resultado vazio de uma busca ou listagem."
        >
          <div className={styles.previewStack}>
            <EmptyState description="Ajuste os filtros." title="Nenhuma ficha encontrada" />
          </div>
        </Specimen>

        <Specimen
          code={`<StatusPanel title="Ficha indisponível" description="…" tone="danger" />`}
          name="StatusPanel"
          usage="Estado de erro ou indisponibilidade de uma rota inteira."
        >
          <div className={styles.previewStack}>
            <StatusPanel
              description="Verifique a conexão com o banco."
              headingLevel="h2"
              id="ds-status-panel-title"
              title="Serviço indisponível"
              tone="danger"
            />
          </div>
        </Specimen>

        <Specimen
          code={`<LoadingBar size="md" />`}
          dont="Skeleton nunca. Use spinner em botões e barra em transições."
          name="LoadingBar"
          usage="Transição de página e carregamento de bloco."
        >
          <div className={styles.previewStack}>
            <LoadingBar size="md" />
          </div>
        </Specimen>

        <Specimen
          code={`toast.success("Ficha salva", { description: "As alterações foram gravadas." });`}
          dont="Não crie provider próprio: sonner é usado direto."
          name="Toast (sonner)"
          usage="Confirmação de ação assíncrona."
        >
          <Button onClick={() => toast.success("Ficha salva", { description: "As alterações foram gravadas." })} variant="secondary">
            Disparar toast
          </Button>
        </Specimen>
      </section>
    </div>
  );
}
