"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { cx, Select, Spinner } from "@/components/ui";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const path = usePathname();
  const router = useRouter();
  if (loading || !user) return <Spinner />;

  const isSuperAdmin = ["SUPERADMIN", "ADMIN"].includes(user.role);
  useEffect(() => {
    if (!isSuperAdmin) return;
    const protectedOpsRoutes = ["/dashboard", "/measurements", "/quotations", "/clients"];
    if (protectedOpsRoutes.some((route) => path === route || path.startsWith(`${route}/`))) {
      router.replace("/superadmin");
    }
  }, [isSuperAdmin, path, router]);

  const nav = isSuperAdmin
    ? [
        { href: "/superadmin", label: t("superadmin") },
        { href: "/superadmin/tenants", label: t("tenantManagement") },
        { href: "/superadmin/subscriptions", label: t("subscriptions") },
        { href: "/users", label: t("users") },
      ]
    : [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/measurements", label: t("measurements") },
        { href: "/quotations", label: t("quotations") },
        { href: "/clients", label: t("clients") },
      ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <svg width="22" height="22" viewBox="0 0 36 36" aria-hidden="true">
              <rect x="2" y="2" width="32" height="32" rx="3" fill="#4472c4" />
              <rect x="8" y="8" width="9" height="20" fill="#bfe4fb" />
              <rect x="19" y="8" width="9" height="20" fill="#bfe4fb" />
            </svg>
            {t("title")}
          </Link>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm",
                  path.startsWith(n.href) ? "bg-brand-50 font-medium text-brand-700" : "text-ink-soft hover:bg-black/5",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "sq" | "it")}
              className="max-w-[120px] bg-white text-xs"
              aria-label={t("language")}
            >
              <option value="en">{t("english")}</option>
              <option value="sq">{t("albanian")}</option>
              <option value="it">{t("italian")}</option>
            </Select>
            <Link href="/account" className="text-ink-soft hover:text-ink">{user.name}</Link>
            <button onClick={logout} className="rounded-md border border-line px-2.5 py-1 text-ink-soft hover:bg-black/5">{t("signOut")}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
