"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { enterAs } from "@/lib/store/store";

const HOME: Record<string, string> = { "u-karim": "/app/accueil" };

/** Enter the app as a persona (writes the session to the store, then navigates). */
export function useEnter() {
  const router = useRouter();
  return useCallback(
    (userId: string, opts?: { tour?: boolean }) => {
      enterAs(userId);
      router.push(`${HOME[userId] ?? "/app/accueil"}${opts?.tour ? "?tour=1" : ""}`);
    },
    [router],
  );
}
