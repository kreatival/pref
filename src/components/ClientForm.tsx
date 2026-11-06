"use client";
import { FormEvent, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Client } from "@/lib/types";
import { Alert, Button, Field, Input, Textarea } from "./ui";

export default function ClientForm({ initial, onSaved, onCancel }: { initial?: Client | null; onSaved: (c: Client) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const [f, setF] = useState({
    name: initial?.name ?? "", phone: initial?.phone ?? "", email: initial?.email ?? "",
    address: initial?.address ?? "", city: initial?.city ?? "", notes: initial?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = initial
        ? await api<Client>(`/clients/${initial.id}`, { method: "PATCH", body: f })
        : await api<Client>("/clients", { method: "POST", body: f });
      onSaved(saved);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <Field label={t("name")}><Input required autoFocus value={f.name} onChange={set("name")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("phone")}><Input value={f.phone} onChange={set("phone")} inputMode="tel" /></Field>
        <Field label={t("email")}><Input type="email" value={f.email} onChange={set("email")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Address"><Input value={f.address} onChange={set("address")} /></Field>
        <Field label={t("city")}><Input value={f.city} onChange={set("city")} /></Field>
      </div>
      <Field label={t("notes")}><Textarea value={f.notes} onChange={set("notes")} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t("cancel")}</Button>
        <Button type="submit" disabled={busy}>{busy ? t("savePassword") : t("saveClient")}</Button>
      </div>
    </form>
  );
}
