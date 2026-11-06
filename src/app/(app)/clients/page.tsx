"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ClientForm from "@/components/ClientForm";
import { Alert, Button, Card, Empty, Input, Modal, PageHeader, Pagination, Spinner, td, th } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDebounced } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";
import { Client, Paginated } from "@/lib/types";

export default function ClientsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Paginated<Client> | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);

  const load = useCallback(() => {
    api<Paginated<Client>>(`/clients?page=${page}&pageSize=20&q=${encodeURIComponent(dq)}`)
      .then(setRes)
      .catch((e) => setError(errMsg(e)));
  }, [page, dq]);

  useEffect(() => { setPage(1); }, [dq]);
  useEffect(load, [load]);

  async function remove(c: Client) {
    if (!confirm(`Delete client "${c.name}"?`)) return;
    try {
      await api(`/clients/${c.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <>
      <PageHeader title={t("clients")} actions={<Button onClick={() => setEditing(null)}>{t("newClient")}</Button>} />
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="border-b border-line p-3">
          <Input placeholder={t("searchByNamePhoneEmailCity")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        </div>
        {!res ? <Spinner /> : res.data.length === 0 ? <Empty>{t("noClientsFound")}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>{t("name")}</th><th className={th}>{t("phone")}</th><th className={th}>{t("city")}</th><th className={th}>{t("quotes")}</th><th className={th} /></tr></thead>
              <tbody>
                {res.data.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className={td}>
                      <div className="font-medium">{c.name}</div>
                      {c.email && <div className="text-xs text-ink-faint">{c.email}</div>}
                    </td>
                    <td className={td}>{c.phone ?? "—"}</td>
                    <td className={td}>{c.city ?? "—"}</td>
                    <td className={td}>
                      {c._count?.quotations ? <Link className="text-brand-700 hover:underline" href={`/quotations?clientId=${c.id}`}>{c._count.quotations}</Link> : 0}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>{t("edit")}</Button>
                      {user && ["SUPERADMIN", "WORKSHOP_ADMIN", "ADMIN"].includes(user.role) && <Button variant="ghost" size="sm" className="text-red-700" onClick={() => remove(c)}>{t("delete")}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {res && <Pagination page={res.page} pageSize={res.pageSize} total={res.total} onPage={setPage} />}
      </Card>
      <Modal open={editing !== undefined} title={editing ? t("editClient") : t("newClient")} onClose={() => setEditing(undefined)}>
        <ClientForm initial={editing} onCancel={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
      </Modal>
    </>
  );
}
