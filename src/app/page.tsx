"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    api<{ role?: string }>("/auth/me")
      .then((user) => {
        const isSuperAdmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN";
        router.replace(isSuperAdmin ? "/superadmin" : "/dashboard");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return <Spinner />;
}
