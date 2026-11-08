import { VenetianMask } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Department, User } from "@/lib/store/types";
import { initials } from "@/lib/store/engine";

const sizes = { xs: "size-5 text-[0.55em]", sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-12 text-md", xl: "size-16 text-lg" } as const;

export function Avatar({ user, dept, size = "md", className, ring }: { user: Pick<User, "firstName" | "lastName" | "departmentId">; dept?: Department; size?: keyof typeof sizes; className?: string; ring?: boolean }) {
  const hue = dept?.hue ?? hashHue(user.departmentId);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-wide", sizes[size], ring && "ring-2 ring-white", className)}
      style={{ background: `oklch(0.93 0.04 ${hue})`, color: `oklch(0.38 0.09 ${hue})` }}
    >
      {initials(user)}
    </span>
  );
}
function hashHue(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function AvatarStack({ users, depts, max = 4, size = "sm" }: { users: User[]; depts: Department[]; max?: number; size?: keyof typeof sizes }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((u, i) => (
        <span key={u.id} className={i ? "-ms-2" : ""}>
          <Avatar user={u} dept={depts.find((d) => d.id === u.departmentId)} size={size} ring />
        </span>
      ))}
      {rest > 0 && <span className={cn("-ms-2 inline-flex items-center justify-center rounded-full bg-paper-deep font-medium text-text-secondary ring-2 ring-white", sizes[size])}>+{rest}</span>}
    </span>
  );
}

export function AnonymousBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white", className)}>
      <VenetianMask className="size-3.5" aria-hidden />
      Anonyme
    </span>
  );
}

export function PersonChip({ user, dept, sub, size = "sm", className }: { user: User; dept?: Department; sub?: string | null; size?: keyof typeof sizes; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <Avatar user={user} dept={dept} size={size} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-medium text-text">
          {user.firstName} {user.lastName}
        </span>
        {sub !== null && <span className="block truncate text-xs text-text-muted">{sub ?? user.jobTitle}</span>}
      </span>
    </span>
  );
}
