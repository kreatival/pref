"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { Alert, Button, Card, PageHeader, Spinner } from "@/components/ui";
import { User } from "@/lib/types";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<User[]>("/users")
      .then(setUsers)
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (!user) return <Spinner />;
  if (!["SUPERADMIN", "ADMIN"].includes(user.role)) {
    return <Alert>{t("onlyAdmins")}</Alert>;
  }

  if (error) return <Alert>{error}</Alert>;
  if (!users) return <Spinner />;

  return (
    <>
      <PageHeader
        title={t("superadminDashboard")}
        subtitle={t("platformOverview")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/users">
              <Button>{t("manageUsers")}</Button>
            </Link>
            <Link href="/superadmin/tenants">
              <Button variant="secondary">Tenants</Button>
            </Link>
            <Link href="/superadmin/subscriptions">
              <Button variant="secondary">Subscriptions</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-ink-soft">{t("userAccounts")}</div>
          <div className="mt-2 text-3xl font-semibold">{users.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-soft">{t("tenantManagement")}</div>
          <div className="mt-2 text-3xl font-semibold">1</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-soft">{t("subscriptions")}</div>
          <div className="mt-2 text-3xl font-semibold">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-soft">{t("platformNotifications")}</div>
          <div className="mt-2 text-3xl font-semibold">0</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("manageUsers")}</h2>
            <Link href="/users" className="text-sm font-medium text-brand-700 hover:underline">{t("users")}</Link>
          </div>
          <div className="space-y-2 text-sm text-ink-soft">
            <p>{user.name}</p>
            <p>{t("tenant")}: {user.tenantId ?? "platform"}</p>
            <p>{t("role")}: {user.role}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("operations")}</h2>
            <span className="text-sm text-ink-faint">{t("superadmin")}</span>
          </div>
          <div className="space-y-2 text-sm text-ink-soft">
            <p>• {t("tenantManagement")}</p>
            <p>• {t("userAccounts")}</p>
            <p>• {t("subscriptions")}</p>
            <p>• {t("platformNotifications")}</p>
          </div>
        </Card>
      </div>
    </>
  );
}
