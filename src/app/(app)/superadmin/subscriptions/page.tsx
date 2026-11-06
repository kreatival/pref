"use client";

import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { Alert, Card, PageHeader, Spinner } from "@/components/ui";

type SubscriptionItem = {
  id: string;
  tenant: string;
  slug: string;
  plan: string;
  status: string;
  subscriptionEndsAt: string | null;
  users: number;
  clients: number;
  quotations: number;
  nextBilling: string;
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [form, setForm] = useState({ subscriptionStatus: "ACTIVE", subscriptionEndsAt: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<SubscriptionItem[]>("/tenants/subscriptions");
      setItems(data);
      if (!selectedTenant && data[0]) setSelectedTenant(data[0].id);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTenant) return;
    try {
      await api(`/tenants/${selectedTenant}/status`, {
        method: "PATCH",
        body: {
          subscriptionStatus: form.subscriptionStatus,
          subscriptionEndsAt: form.subscriptionEndsAt || null,
        },
      });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!user) return <Spinner />;
  if (!["SUPERADMIN", "ADMIN"].includes(user.role)) {
    return <Alert>{t("onlyAdmins")}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={t("subscriptions")}
        subtitle="Monitor tenant plans, billing status, and platform usage"
      />

      {error && <Alert>{error}</Alert>}

      <Card className="mb-4 p-4">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[220px_180px_180px_auto] md:items-end">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Tenant</span>
            <select
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.tenant}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Status</span>
            <select
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={form.subscriptionStatus}
              onChange={(e) => setForm((current) => ({ ...current, subscriptionStatus: e.target.value }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Expiry date</span>
            <input
              type="date"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              value={form.subscriptionEndsAt}
              onChange={(e) => setForm((current) => ({ ...current, subscriptionEndsAt: e.target.value }))}
            />
          </label>
          <button type="submit" className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Save status
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Tenant</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Plan</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Status</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Expiry</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Users</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Clients</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Quotations</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Billing</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{item.tenant}</div>
                      <div className="text-xs text-ink-faint">{item.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        {item.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-soft">{item.status}</td>
                    <td className="px-4 py-3 text-sm text-ink-soft">{item.subscriptionEndsAt ? new Date(item.subscriptionEndsAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-sm">{item.users}</td>
                    <td className="px-4 py-3 text-sm">{item.clients}</td>
                    <td className="px-4 py-3 text-sm">{item.quotations}</td>
                    <td className="px-4 py-3 text-sm text-ink-soft">{item.nextBilling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
