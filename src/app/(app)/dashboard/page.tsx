"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { fmtDate, money, STATUS_LABEL } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { Paginated, QuotationRow, QuotationStatus, Stats } from "@/lib/types";
import { Alert, Button, Card, Empty, PageHeader, Spinner, StatusBadge, td, th } from "@/components/ui";

const ORDER: QuotationStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<QuotationRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<Stats>("/quotations/stats"), api<Paginated<QuotationRow>>("/quotations?pageSize=8")])
      .then(([s, r]) => { setStats(s); setRecent(r.data); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats || !recent) return <Spinner />;

  const by = (s: QuotationStatus) => stats.byStatus.find((x) => x.status === s) ?? { count: 0, value: 0 };

  return (
    <>
      <PageHeader
        title={t("dashboard")}
        subtitle={`${stats.clients} ${t("clientsOnFile")}`}
        actions={<Link href="/quotations/new"><Button>{t("newQuotation")}</Button></Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ORDER.map((s) => (
          <Card key={s} className="p-4">
            <div className="text-sm text-ink-soft">{STATUS_LABEL[s]}</div>
            <div className="mt-1 text-2xl font-semibold">{by(s).count}</div>
            <div className="mt-0.5 text-sm text-ink-faint">{money(by(s).value)}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="border-b border-line px-4 py-3 font-medium">{t("recentQuotations")}</div>
        {recent.length === 0 ? <Empty>{t("noQuotationsYet")}</Empty> : (
          <table className="w-full">
            <thead><tr><th className={th}>{t("no")}</th><th className={th}>{t("clientLabel")}</th><th className={th}>{t("date")}</th><th className={th}>{t("status")}</th><th className={`${th} text-right`}>{t("total")}</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-brand-50/40">
                  <td className={td}><Link className="font-medium text-brand-700 hover:underline" href={`/quotations/${r.id}`}>#{r.number}</Link></td>
                  <td className={td}>{r.client.name}</td>
                  <td className={td}>{fmtDate(r.date)}</td>
                  <td className={td}><StatusBadge status={r.status} /></td>
                  <td className={`${td} text-right`}>{money(r.total, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
