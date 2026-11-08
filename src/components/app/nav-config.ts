import { BarChart3, BellRing, BookOpen, CalendarRange, ClipboardList, FileText, Gauge, History, Inbox, LayoutDashboard, Link2, ListChecks, MessageSquareText, Send, Settings, ShieldCheck, Target, UserCog, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/store/types";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  badge?: "tasks" | "synth";
  tour?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL: Role[] = ["COLLABORATEUR", "RESPONSABLE", "ADMIN_RH", "ADMIN_TECH"];
const USERS3: Role[] = ["COLLABORATEUR", "RESPONSABLE", "ADMIN_RH"];

export const NAV: NavGroup[] = [
  {
    label: "Mon espace",
    items: [
      { key: "accueil", label: "Accueil", href: "/app/accueil", icon: LayoutDashboard, roles: ALL, tour: "nav-accueil" },
      { key: "demandes", label: "Mes demandes", href: "/app/demandes", icon: Inbox, roles: USERS3, badge: "tasks", tour: "nav-demandes" },
      { key: "feedbacks", label: "Mes feedbacks", href: "/app/feedbacks", icon: MessageSquareText, roles: USERS3 },
      { key: "missions", label: "Mes missions", href: "/app/missions", icon: ClipboardList, roles: ["COLLABORATEUR", "RESPONSABLE"] },
    ],
  },
  {
    label: "Mon équipe",
    items: [
      { key: "equipe", label: "Suivi de l’équipe", href: "/app/equipe", icon: Users, roles: ["RESPONSABLE"], tour: "nav-equipe" },
      { key: "syntheses", label: "Synthèses", href: "/app/syntheses", icon: FileText, roles: ["RESPONSABLE"], badge: "synth", tour: "nav-syntheses" },
    ],
  },
  {
    label: "Pilotage RH",
    items: [
      { key: "cycles", label: "Cycles", href: "/app/cycles", icon: CalendarRange, roles: ["ADMIN_RH"], tour: "nav-cycles" },
      { key: "missions-all", label: "Missions", href: "/app/missions", icon: ClipboardList, roles: ["ADMIN_RH"], tour: "nav-missions" },
      { key: "suivi", label: "Suivi & rappels", href: "/app/suivi", icon: Gauge, roles: ["ADMIN_RH"], tour: "nav-suivi" },
      { key: "client", label: "Feedback client", href: "/app/feedback-client", icon: Link2, roles: ["ADMIN_RH"], tour: "nav-client" },
    ],
  },
  {
    label: "Référentiels",
    items: [
      { key: "collaborateurs", label: "Collaborateurs", href: "/app/collaborateurs", icon: Users, roles: ["ADMIN_RH", "ADMIN_TECH", "RESPONSABLE"] },
      { key: "competences", label: "Compétences & questions", href: "/app/competences", icon: ListChecks, roles: ["ADMIN_RH"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "messages", label: "Messages", href: "/app/messages", icon: BellRing, roles: ["ADMIN_RH"] },
      { key: "journal", label: "Journal d’administration", href: "/app/journal", icon: History, roles: ["ADMIN_RH", "ADMIN_TECH"] },
      { key: "utilisateurs", label: "Utilisateurs & rôles", href: "/app/utilisateurs", icon: UserCog, roles: ["ADMIN_TECH"] },
      { key: "parametres", label: "Paramètres", href: "/app/parametres", icon: Settings, roles: ["ADMIN_RH", "ADMIN_TECH"], tour: "nav-parametres" },
      { key: "aide", label: "Aide & anonymat", href: "/app/aide", icon: BookOpen, roles: ALL },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
}

export const CRUMBS: Record<string, string> = {
  accueil: "Accueil",
  demandes: "Mes demandes",
  feedbacks: "Mes feedbacks",
  missions: "Missions",
  equipe: "Suivi de l’équipe",
  syntheses: "Synthèses",
  cycles: "Cycles",
  suivi: "Suivi & rappels",
  "feedback-client": "Feedback client",
  collaborateurs: "Collaborateurs",
  competences: "Compétences & questions",
  messages: "Messages",
  journal: "Journal d’administration",
  utilisateurs: "Utilisateurs & rôles",
  parametres: "Paramètres",
  aide: "Aide & anonymat",
  anonymat: "Comment fonctionne l’anonymat",
  feedback: "Feedback",
  nouveau: "Donner un feedback",
};
export const ICONS = { BarChart3, Send, ShieldCheck, Target };
