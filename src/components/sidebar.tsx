"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  CalendarDays,
  FolderOpen,
  PhoneCall,
  Handshake,
  Presentation,
  Settings,
  Search,
  BarChart3,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/constants";

type NavUser = {
  id: string;
  name: string;
  role: string;
  teamName: string | null;
  isManager: boolean;
};

const baseNav = [
  { href: "/", label: "My Day", icon: LayoutDashboard },
  { href: "/leads/new", label: "New lead", icon: PlusCircle },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/workspace/research", label: "Research", icon: Search },
  { href: "/workspace/outreach", label: "Outreach", icon: PhoneCall },
  { href: "/workspace/meetings", label: "Meetings", icon: Handshake },
  { href: "/workspace/demos", label: "Demos", icon: Presentation },
];

export function Sidebar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const nav = [
    ...baseNav,
    ...(user.isManager
      ? [
          { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
          { href: "/admin", label: "Admin", icon: Settings },
        ]
      : []),
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-fg)]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Sales & Growth
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight tracking-tight">
          Pipeline OS
        </h1>
        <p className="mt-1 text-xs text-white/55">
          {user.isManager ? "Manager view" : "Your secured workspace"}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--accent)]/15 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 px-4 py-4 text-xs">
        <div>
          <p className="font-medium text-white">{user.name}</p>
          <p className="text-white/50">
            {user.role}
            {user.teamName ? ` · ${user.teamName}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-left text-white/55 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
