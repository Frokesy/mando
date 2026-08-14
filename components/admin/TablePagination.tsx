"use client";

import { useEffect, useMemo, useState } from "react";

export function useTablePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, pageCount, pageItems, totalItems: items.length, pageSize };
}

export function TablePagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] text-[#6A7282]">
      <span>Showing {first}–{last} of {totalItems}</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        <span>Page {page} of {pageCount}</span>
        <button type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
