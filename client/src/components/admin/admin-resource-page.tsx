"import type { ReactNode } from "react";

export type AdminColumn = { label: string; key: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAdminRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  if (Array.isArray(value.items)) return value.items.filter(isRecord);
  if (Array.isArray(value.data)) return value.data.filter(isRecord);
  if (isRecord(value.data) && Array.isArray(value.data.items)) {
    return value.data.items.filter(isRecord);
  }
  return [];
}

export function getAdminTotal(value: unknown): number | null {
  if (!isRecord(value)) return Array.isArray(value) ? value.length : null;
  const pagination = isRecord(value.pagination) ? value.pagination : null;
  if (pagination && typeof pagination.total === "number") return pagination.total;
  if (isRecord(value.data)) {
    const nested = value.data;
    if (isRecord(nested.pagination) && typeof nested.pagination.total === "number") {
      return nested.pagination.total;
    }
    if (typeof nested.total === "number") return nested.total;
  }
  if (typeof value.total === "number") return value.total;
  return Array.isArray(value.data) ? value.data.length : null;
}

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) return current[Number(segment)];
    if (isRecord(current)) return current[segment];
    return undefined;
  }, source);
}

function displayValue(value: unknown, key: string): ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === "object") return "Available";
  if (typeof value === "string" && /(createdAt|updatedAt|expiresAt|publishedAt|shippedAt|paidAt)$/i.test(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }
  if (typeof value === "number" && /(amount|price|total|value)$/i.test(key)) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  }
  return String(value);
}

export function AdminResourcePage({
  title,
  description,
  result,
  columns,
  emptyMessage = "No records found.",
  actions,
}: {
  title: string;
  description: string;
  result: unknown;
  columns: AdminColumn[];
  emptyMessage?: string;
  actions?: ReactNode;
}) {
  const failed = isRecord(result) && result.success === false;
  const message = failed && typeof result.message === "string" ? result.message : "The API request failed.";
  const rows = getAdminRows(result);

  return (
    <div className="space-y-6">
      {title && <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Store management</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        {actions}
      </header>}
      {failed ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Could not load {title.toLowerCase()}: {message}
          {isRecord(result) && typeof result.statusCode === "number" ? ` (HTTP ${result.statusCode})` : ""}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-700">{emptyMessage}</p>
          <p className="mt-1 text-xs text-slate-400">This page is connected to the existing backend service.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{columns.map((column) => <th key={column.key} className="px-5 py-3.5 font-semibold">{column.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={String(row.id ?? row.orderNumber ?? row.code ?? index)} className="transition hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td key={column.key} className="max-w-[280px] truncate px-5 py-4 text-slate-700">
                      {displayValue(readPath(row, column.key), column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
