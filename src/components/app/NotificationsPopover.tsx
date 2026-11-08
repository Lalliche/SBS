"use client";
import { Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { markAllRead, markRead } from "@/lib/store/actions";
import { relDate } from "@/lib/store/engine";
import { notificationsFor, unreadFor } from "@/lib/store/selectors";
import { useSession } from "@/lib/store/hooks";
import { IconButton } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/Surface";

const KIND_DOT: Record<string, string> = { DEMANDE: "bg-info", RAPPEL: "bg-warning", SYNTHESE: "bg-success", SYSTEME: "bg-text-muted", FEEDBACK: "bg-ink", CLIENT: "bg-accent" };

export function NotificationItems({ filter, onNavigate }: { filter: "all" | "unread"; onNavigate?: () => void }) {
  const { s, me } = useSession();
  const router = useRouter();
  if (!me) return null;
  const items = notificationsFor(s, me.id).filter((n) => (filter === "unread" ? !n.read : true));
  if (!items.length) return <EmptyState icon={BellOff} title="Aucune notification" description="Vous êtes à jour." className="py-10" />;
  // group by day
  const groups = new Map<string, typeof items>();
  items.forEach((n) => {
    const k = relDate(s.now, n.createdAt);
    groups.set(k, [...(groups.get(k) ?? []), n]);
  });
  return (
    <div>
      {[...groups].map(([day, list]) => (
        <div key={day}>
          <p className="sticky top-0 bg-canvas px-4 py-1.5 text-xs font-medium capitalize text-text-muted">{day}</p>
          <ul>
            {list.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    act((d) => markRead(d, n.id));
                    onNavigate?.();
                    router.push(n.href);
                  }}
                  className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-start transition-colors hover:bg-paper focus-visible:shadow-none focus-visible:bg-paper"
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent ring-1 ring-border-strong" : KIND_DOT[n.kind])} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm text-ink", !n.read && "font-semibold")}>{n.title}</span>
                    <span className="mt-0.5 block text-sm text-text-secondary text-pretty">{n.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function NotificationsPopover() {
  const { s, me } = useSession();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const router = useRouter();
  if (!me) return null;
  const unread = unreadFor(s, me.id);
  return (
    <Popover
      label="Notifications"
      width="min(380px, 94vw)"
      trigger={({ toggle, ref, open }) => (
        <IconButton ref={ref} label="Notifications" onClick={toggle} active={open} data-tour="bell">
          <span className="relative">
            <Bell className="size-[1.15em]" />
            {unread > 0 && <span className="absolute -end-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65em] font-semibold leading-4 text-white tabular-nums">{unread > 9 ? "9+" : unread}</span>}
          </span>
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="text-md font-semibold text-ink">Notifications</p>
            <button type="button" onClick={() => act((d) => markAllRead(d, me.id))} className="text-xs font-medium text-text-secondary underline-offset-2 hover:text-ink hover:underline focus-visible:shadow-none">
              Tout marquer comme lu
            </button>
          </div>
          <Tabs label="Filtre" value={tab} onChange={setTab} className="px-2" items={[{ value: "all", label: "Tout" }, { value: "unread", label: "Non lues", count: unread }]} />
          <NotificationItems filter={tab} onNavigate={close} />
          {me.role === "ADMIN_RH" && (
            <button
              type="button"
              onClick={() => {
                close();
                router.push("/app/messages");
              }}
              className="w-full border-t border-border px-4 py-3 text-center text-sm font-medium text-ink hover:bg-paper focus-visible:shadow-none"
            >
              Voir toutes les notifications
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}
