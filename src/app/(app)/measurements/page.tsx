"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Input, PageHeader, Pagination, Select, Spinner, td, th } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";
import { MeasurementRow, MeasurementStatus, Paginated } from "@/lib/types";

function List() {
  const { t } = useLanguage();
  const clientId = useSearchParams().get("clientId") ?? "";
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [status, setStatus] = useState<"" | MeasurementStatus>("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Paginated<MeasurementRow> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setPage(1); }, [dq, status, clientId]);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (dq) p.set("q", dq);
    if (status) p.set("status", status);
    if (clientId) p.set("clientId", clientId);
    api<Paginated<MeasurementRow>>(`/measurements?${p}`).then(setRes).catch((e) => setError(errMsg(e)));
  }, [page, dq, status, clientId]);
  useEffect(load, [load]);

  return (
    <>
      <PageHeader
        title={t("measurements")}
        subtitle={t("measurementSubtitle")}
        actions={<Link href="/measurements/new"><Button>{t("newMeasurement")}</Button></Link>}
      />
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <Input placeholder={t("searchByClientAddressNumber")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as "" | MeasurementStatus)} className="max-w-[160px]">
            <option value="">{t("allStatuses")}</option>
            <option value="DRAFT">{t("inProgress")}</option>
            <option value="COMPLETED">{t("completed")}</option>
          </Select>
        </div>
        {!res ? <Spinner /> : res.data.length === 0 ? <Empty>{t("noMeasurementsYet")}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>{t("no")}</th><th className={th}>{t("clientLabel")}</th><th className={th}>{t("site")}</th><th className={th}>{t("date")}</th><th className={th}>{t("openings")}</th><th className={th}>{t("status")}</th><th className={th}>{t("quotationLabel")}</th></tr></thead>
              <tbody>
                {res.data.map((r) => (
                  <tr key={r.id} className="border-t border-line hover:bg-brand-50/40">
                    <td className={td}><Link className="font-medium text-brand-700 hover:underline" href={`/measurements/${r.id}`}>M-{r.number}</Link></td>
                    <td className={td}>{r.client.name}</td>
                    <td className={td}>{r.siteAddress ?? "—"}</td>
                    <td className={td}>{fmtDate(r.date)}</td>
                    <td className={td}>{r.linesCount}</td>
                    <td className={td}>
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${r.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-700"}`}>
                        {r.status === "COMPLETED" ? t("completed") : t("inProgress")}
                      </span>
                    </td>
                    <td className={td}>{r.quotation ? <Link className="text-brand-700 hover:underline" href={`/quotations/${r.quotation.id}`}>#{r.quotation.number}</Link> : "—"}</td>
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

export default function MeasurementsPage() {
  return <Suspense fallback={<Spinner />}><List /></Suspense>;
}
