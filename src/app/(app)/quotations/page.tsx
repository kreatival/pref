"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Input, PageHeader, Pagination, Select, Spinner, StatusBadge, td, th } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { fmtDate, money, STATUS_LABEL } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";
import { Paginated, QuotationRow, QuotationStatus } from "@/lib/types";

function List() {
  const { t } = useLanguage();
  const clientId = useSearchParams().get("clientId") ?? "";
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [status, setStatus] = useState<"" | QuotationStatus>("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Paginated<QuotationRow> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setPage(1); }, [dq, status, clientId]);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (dq) p.set("q", dq);
    if (status) p.set("status", status);
    if (clientId) p.set("clientId", clientId);
    api<Paginated<QuotationRow>>(`/quotations?${p}`).then(setRes).catch((e) => setError(errMsg(e)));
  }, [page, dq, status, clientId]);
  useEffect(load, [load]);

  async function duplicate(id: string) {
    try {
      const copy = await api<{ id: string }>(`/quotations/${id}/duplicate`, { method: "POST" });
      window.location.href = `/quotations/${copy.id}`;
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <>
      <PageHeader title={t("quotations")} actions={<Link href="/quotations/new"><Button>{t("newQuotation")}</Button></Link>} />
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <Input placeholder={t("searchByClientOrNumber")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as "" | QuotationStatus)} className="max-w-[160px]">
            <option value="">{t("allStatuses")}</option>
            {(Object.keys(STATUS_LABEL) as QuotationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
          {clientId && <Link href="/quotations"><Button variant="secondary">{t("clearClientFilter")}</Button></Link>}
        </div>
        {!res ? <Spinner /> : res.data.length === 0 ? <Empty>{t("noQuotationsYet")}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>{t("no")}</th><th className={th}>{t("clientLabel")}</th><th className={th}>{t("date")}</th><th className={th}>{t("items")}</th><th className={th}>{t("status")}</th><th className={`${th} text-right`}>{t("total")}</th><th className={th} /></tr></thead>
              <tbody>
                {res.data.map((r) => (
                  <tr key={r.id} className="border-t border-line hover:bg-brand-50/40">
                    <td className={td}><Link className="font-medium text-brand-700 hover:underline" href={`/quotations/${r.id}`}>#{r.number}</Link></td>
                    <td className={td}>{r.client.name}</td>
                    <td className={td}>{fmtDate(r.date)}</td>
                    <td className={td}>{r.itemsCount}</td>
                    <td className={td}><StatusBadge status={r.status} /></td>
                    <td className={`${td} text-right font-medium`}>{money(r.total, r.currency)}</td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <a href={`/api/quotations/${r.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm">{t("pdf")}</Button></a>
                      <Button variant="ghost" size="sm" onClick={() => duplicate(r.id)}>{t("duplicate")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {res && <Pagination page={res.page} pageSize={res.pageSize} total={res.total} onPage={setPage} />}
      </Card>
    </>
  );
}

export default function QuotationsPage() {
  return <Suspense fallback={<Spinner />}><List /></Suspense>;
}
