"use client";

import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "PAUSED" | "TRIAL" | "CANCELLED";
  users: number;
  clients: number;
  quotations: number;
  createdAt: string;
};

const defaultForm = { name: "", slug: "", status: "ACTIVE" as Tenant["status"] };

export default function TenantManagementPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await api<Tenant[]>("/tenants");
      setTenants(data);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setSaving(true);
    try {
      await api<Tenant>("/tenants", { method: "POST", body: form });
      setForm(defaultForm);
      await fetchTenants();
      setSuccess("Tenant created successfully.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <Spinner />;
  if (!["SUPERADMIN", "ADMIN"].includes(user.role)) {
    return <Alert>{t("onlyAdmins")}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={t("tenantManagement")}
        subtitle="Create and monitor tenant companies"
        actions={
          <Button type="button" variant="secondary" onClick={() => fetchTenants()}>
            Refresh
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Add tenant</h2>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Company name">
              <Input
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Example Ltd"
                required
              />
            </Field>
            <Field label="Slug">
              <Input
                value={form.slug}
                onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))}
                placeholder="example-ltd"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as Tenant["status"] }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </Field>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Create tenant"}
            </Button>
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
                    <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Slug</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Status</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Users</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Clients</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase text-ink-soft">Quotations</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{tenant.name}</div>
                        <div className="text-xs text-ink-faint">{new Date(tenant.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-soft">{tenant.slug}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{tenant.users}</td>
                      <td className="px-4 py-3 text-sm">{tenant.clients}</td>
                      <td className="px-4 py-3 text-sm">{tenant.quotations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
