"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, td, th } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { Role, User } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "SUPERADMIN", label: "Super admin" },
  { value: "WORKSHOP_ADMIN", label: "Workshop admin" },
  { value: "OPERATOR", label: "Operator" },
  { value: "USER", label: "User" },
];

function UserForm({ initial, onDone, onCancel }: { initial: User | null; onDone: () => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const normalizedRole = initial?.role === "ADMIN" ? "SUPERADMIN" : (initial?.role ?? "USER");
  const [f, setF] = useState({ name: initial?.name ?? "", email: initial?.email ?? "", role: normalizedRole as Role, password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (initial) {
        await api(`/users/${initial.id}`, { method: "PATCH", body: { name: f.name, role: f.role, ...(f.password ? { password: f.password } : {}) } });
      } else {
        await api("/users", { method: "POST", body: f });
      }
      onDone();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <Field label={t("name")}><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label={t("email")}><Input type="email" required disabled={!!initial} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label={t("role")}>
        <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
        </Select>
      </Field>
      <Field label={initial ? t("newPassword") : t("password")} hint={t("atLeast8Characters")}>
        <Input type="password" minLength={8} required={!initial} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t("cancel")}</Button>
        <Button type="submit" disabled={busy}>{busy ? t("signingIn") : t("saveUser")}</Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<User | null | undefined>(undefined);

  const load = useCallback(() => {
    api<User[]>("/users").then(setUsers).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  async function toggle(u: User) {
    try {
      await api(`/users/${u.id}`, { method: "PATCH", body: { active: !u.active } });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function remove(u: User) {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  if (!me || !["SUPERADMIN", "ADMIN"].includes(me.role)) return <Alert>{t("onlyAdmins")}</Alert>;

  return (
    <>
      <PageHeader title={t("users")} actions={<Button onClick={() => setEditing(null)}>{t("newUser")}</Button>} />
      {error && <Alert>{error}</Alert>}
      <Card>
        {!users ? <Spinner /> : (
          <table className="w-full">
            <thead><tr><th className={th}>{t("name")}</th><th className={th}>{t("email")}</th><th className={th}>{t("role")}</th><th className={th}>{t("status")}</th><th className={th} /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className={`${td} font-medium`}>{u.name}</td>
                  <td className={td}>{u.email}</td>
                  <td className={td}>{ROLE_OPTIONS.find((role) => role.value === u.role)?.label ?? u.role}</td>
                  <td className={td}>{u.active ? t("active") : <span className="text-ink-faint">{t("disabled")}</span>}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>{t("edit")}</Button>
                    {u.id !== me.id && <Button variant="ghost" size="sm" onClick={() => toggle(u)}>{u.active ? t("disabled") : t("active")}</Button>}
                    {u.id !== me.id && <Button variant="ghost" size="sm" onClick={() => remove(u)}>{t("delete")}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={editing !== undefined} title={editing ? t("editUser") : t("newUser")} onClose={() => setEditing(undefined)}>
        <UserForm initial={editing ?? null} onCancel={() => setEditing(undefined)} onDone={() => { setEditing(undefined); load(); }} />
      </Modal>
    </>
  );
}
