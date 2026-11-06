"use client";
import { FormEvent, useState } from "react";
import { Alert, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";

export default function AccountPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentPassword, setCur] = useState("");
  const [newPassword, setNew] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      setMsg({ tone: "success", text: t("passwordChanged") });
      setCur("");
      setNew("");
    } catch (err) {
      setMsg({ tone: "error", text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t("account")} subtitle={user ? `${user.name} · ${user.email}` : undefined} />
      <Card className="max-w-md p-5">
        <h2 className="mb-3 font-medium">{t("changePassword")}</h2>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <form onSubmit={submit} className="space-y-3">
          <Field label={t("currentPassword")}><Input type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCur(e.target.value)} /></Field>
          <Field label={t("newPassword")} hint={t("atLeast8Characters")}><Input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} /></Field>
          <Button type="submit" disabled={busy}>{busy ? t("savePassword") : t("updatePassword")}</Button>
        </form>
      </Card>
    </>
  );
}
