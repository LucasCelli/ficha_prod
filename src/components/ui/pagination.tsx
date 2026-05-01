import Link from "next/link";

type PaginationProps = {
  basePath: string;
  currentPage: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
  totalItems: number;
};

export function Pagination({ basePath, currentPage, pageSize, params = {}, totalItems }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <nav className="ui-pagination" aria-label="Paginação">
      <Link
        aria-disabled={currentPage <= 1}
        className="ui-pagination__link"
        href={buildPageHref(basePath, params, Math.max(1, currentPage - 1))}
      >
        Anterior
      </Link>

      <div className="ui-pagination__pages" aria-label={`Página ${currentPage} de ${totalPages}`}>
        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span className="ui-pagination__ellipsis" key={`ellipsis-${index}`}>
              …
            </span>
          ) : (
            <Link
              aria-current={page === currentPage ? "page" : undefined}
              className="ui-pagination__page"
              href={buildPageHref(basePath, params, page)}
              key={page}
            >
              {page}
            </Link>
          ),
        )}
      </div>

      <Link
        aria-disabled={currentPage >= totalPages}
        className="ui-pagination__link"
        href={buildPageHref(basePath, params, Math.min(totalPages, currentPage + 1))}
      >
        Próxima
      </Link>
    </nav>
  );
}

function buildPageHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  if (page > 1) {
    searchParams.set("page", String(page));
  } else {
    searchParams.delete("page");
  }

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const visiblePages: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      visiblePages.push("ellipsis");
    }
    visiblePages.push(page);
  });

  return visiblePages;
}
