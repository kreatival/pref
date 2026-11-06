"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errMsg } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Alert, Button, Field, Input, Select } from "@/components/ui";


export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await api<{ role?: string }>("/auth/login", { method: "POST", body: { email, password } });
      const isSuperAdmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN";
      router.replace(isSuperAdmin ? "/superadmin" : "/dashboard");
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <Select value={locale} onChange={(e) => setLocale(e.target.value as "en" | "sq" | "it")} className="w-32 text-sm" aria-label={t("language")}>
            <option value="en">{t("english")}</option>
            <option value="sq">{t("albanian")}</option>
            <option value="it">{t("italian")}</option>
          </Select>
        </div>
        <div className="mb-6 flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <rect x="2" y="2" width="32" height="32" rx="3" fill="#4472c4" />
            <rect x="8" y="8" width="9" height="20" fill="#bfe4fb" />
            <rect x="19" y="8" width="9" height="20" fill="#bfe4fb" />
          </svg>
          <div>
            <div className="text-lg font-semibold leading-tight">{t("title")}</div>
            <div className="text-sm text-ink-soft">{t("signInContinue")}</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-white p-6">
          {error && <Alert>{error}</Alert>}
          <Field label={t("email")}><Input type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t("password")}><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? t("signingIn") : t("signIn")}</Button>
        </form>
      </div>
    </main>
  );
}
