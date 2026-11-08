"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { act, syncClock, useHydrated } from "@/lib/store/store";
import { fmtDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { dur, ease, overlayFade } from "@/lib/motion-tokens";
import { Skeleton } from "@/components/ui/Surface";


import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DemoBar } from "./DemoBar";
import { CommandPalette } from "./CommandPalette";
import { RequestDrawer } from "./RequestDrawer";
import { MissionDrawer } from "./MissionDrawer";
import { HelpDrawer, ProfileDrawer } from "./Drawers";
import { ClientPreview } from "./ClientPreview";
import { Tour } from "./Tour";
import { ShellContext, type ShellApi } from "./ShellContext";
import { markTour } from "@/lib/store/actions";

const LS = "sbs360:ui";
function readUi() {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? "{}") as { collapsed?: boolean; demoHidden?: boolean };
  } catch {
    return {};
  }
}
function writeUi(patch: object) {
  try {
    localStorage.setItem(LS, JSON.stringify({ ...readUi(), ...patch }));
  } catch {
    /* ignore */
  }
}

function ShellSkeleton() {
  return (
    <div className="flex h-svh">
      <div className="hidden w-[248px] bg-ink md:block" />
      <div className="flex-1 p-8">
        <Skeleton className="h-6 w-60" />
        <Skeleton className="mt-6 h-32 w-full" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

function CycleBanner() {
  const { s, me, cycle, readOnly } = useSession();
  const router = useRouter();
  if (!me) return null;
  if (readOnly)
    return (
      <div className="no-print flex items-center justify-between gap-4 border-b border-warning/25 bg-warning-bg px-6 py-1.5 text-sm text-warning">
        <span className="font-medium">Cycle archivé — lecture seule · {cycle.name}</span>
        <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => { act((d) => (d.viewingCycleId = null)); router.refresh(); }}>
          Revenir au cycle en cours
        </button>
      </div>
    );
  const open = s.cycles.find((c) => c.status === "OUVERT");
  if (!open) return null;
  const text = `Cycle ${open.name} · ouvert jusqu’au ${fmtDate(open.endDate)}`;
  return (
    <div className="no-print flex items-center gap-2 border-b border-border bg-paper px-6 py-1.5 text-xs text-text-secondary">
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      {me.role === "ADMIN_RH" ? (
        <Link href="/app/cycles" className="font-medium text-ink underline-offset-2 hover:underline">
          {text}
        </Link>
      ) : (
        <span className="font-medium text-ink">{text}</span>
      )}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { s, me } = useSession();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [ui] = useState(readUi);
  const [collapsed, setCollapsed] = useState(!!ui.collapsed);
  const [demoHidden, setDemoHidden] = useState(!!ui.demoHidden);
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [profile, setProfile] = useState(false);
  const [mission, setMission] = useState(false);
  const [request, setRequest] = useState<{ open: boolean; missionId?: string; recipientIds?: string[] }>({ open: false });
  const [client, setClient] = useState<{ open: boolean; token?: string }>({ open: false });
  const [tour, setTour] = useState<{ open: boolean; key: number }>({ open: false, key: 0 });

  // Session gate
  useEffect(() => {
    if (!s.session.userId) router.replace("/");
  }, [s.session.userId, router]);
  // Keep the demo clock coherent (mission/link statuses, archiving)
  useEffect(() => {
    syncClock();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDemoHidden((h) => {
          writeUi({ demoHidden: !h });
          return !h;
        });
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const startTour = useCallback(() => {
    router.push("/app/accueil");
    setTimeout(() => setTour((t) => ({ open: true, key: t.key + 1 })), 500);
  }, [router]);

  // ?tour=1 launches the guided tour once
  const wantTour = params.get("tour") === "1";
  useEffect(() => {
    if (wantTour && me) {
      const t = setTimeout(() => setTour((x) => ({ open: true, key: x.key + 1 })), 900);
      router.replace(path);
      return () => clearTimeout(t);
    }
  }, [wantTour, me, router, path]);

  const api = useMemo<ShellApi>(
    () => ({
      openRequest: (o) => setRequest({ open: true, ...o }),
      openMission: () => setMission(true),
      openHelp: () => setHelp(true),
      openProfile: () => setProfile(true),
      openPalette: () => setPalette(true),
      startTour,
      openClientPreview: (token) => setClient({ open: true, token }),
    }),
    [startTour],
  );

  if (!me) return <ShellSkeleton />;

  const bare = path.startsWith("/app/feedback/nouveau");
  return (
    <ShellContext.Provider value={api}>
      <div className="flex h-svh flex-col">
        <DemoBar
          collapsed={demoHidden}
          onToggle={() =>
            setDemoHidden((h) => {
              writeUi({ demoHidden: !h });
              return !h;
            })
          }
        />
        {bare ? (
          <main id="contenu" className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </main>
        ) : (
          <div className="flex min-h-0 flex-1">
            <Sidebar
              collapsed={collapsed}
              onToggle={() =>
                setCollapsed((c) => {
                  writeUi({ collapsed: !c });
                  return !c;
                })
              }
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar onMenu={() => setMobileNav(true)} />
              <CycleBanner />
              <main id="contenu" className="scroll-thin min-h-0 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${me.id}:${path}`}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out } }}
                    className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mobileNav && (
          <div className="fixed inset-0 z-[80] md:hidden">
            <motion.div {...overlayFade} className="absolute inset-0 bg-ink/50" onClick={() => setMobileNav(false)} />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0, transition: { duration: 0.35, ease: ease.drawer } }} exit={{ x: "-100%", transition: { duration: dur.base } }} className="absolute inset-y-0 start-0 w-[18em]">
              <Sidebar collapsed={false} mobile onNavigate={() => setMobileNav(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CommandPalette open={palette} onClose={() => setPalette(false)} onGive={() => router.push("/app/feedback/nouveau")} onRequest={() => setRequest({ open: true })} onCreateMission={() => setMission(true)} />
      <RequestDrawer open={request.open} onClose={() => setRequest({ open: false })} missionId={request.missionId} recipientIds={request.recipientIds} />
      <MissionDrawer open={mission} onClose={() => setMission(false)} />
      <HelpDrawer open={help} onClose={() => setHelp(false)} />
      <ProfileDrawer open={profile} onClose={() => setProfile(false)} />
      <ClientPreview open={client.open} onClose={() => setClient({ open: false })} token={client.token} />
      <Tour
        key={`${me.role}-${tour.key}`}
        role={me.role}
        open={tour.open}
        onClose={() => {
          setTour((t) => ({ ...t, open: false }));
          act((d) => markTour(d, me.id));
        }}
      />
    </ShellContext.Provider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <ShellSkeleton />;
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}


