"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BattlesheetIcon,
  CalendarIcon,
  ClientsIcon,
  CloseIcon,
  CrmIcon,
  FinanceIcon,
  MenuIcon,
  PipelineIcon,
  TemplatesIcon,
} from "@/components/icons";

const groups = [
  {
    label: "Sales",
    items: [
      { href: "/crm", label: "CRM", icon: CrmIcon },
      { href: "/pipeline", label: "Pipeline", icon: PipelineIcon },
      { href: "/templates", label: "Contact Templates", icon: TemplatesIcon },
      { href: "/battlesheet", label: "Sales Battlesheet", icon: BattlesheetIcon },
    ],
  },
  {
    label: "Clients won",
    items: [
      { href: "/clients", label: "Client accounts", icon: ClientsIcon },
      { href: "/clients/calendar", label: "Payment calendar", icon: CalendarIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/finance", label: "Financial dashboard", icon: FinanceIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md p-2 text-muted hover:bg-neutral-100 hover:text-foreground"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 w-60 border-r border-border bg-[#f1f1ef] px-3 py-5 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0 pt-20" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 hidden px-2 md:block">
          <Brand />
        </div>
        <nav aria-label="Main navigation" className="space-y-7">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href === "/clients" && pathname.startsWith("/clients/") && pathname !== "/clients/calendar");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-white text-foreground shadow-sm"
                          : "text-neutral-600 hover:bg-white/70 hover:text-foreground"
                      }`}
                    >
                      <Icon className={active ? "text-emerald-700" : ""} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <p className="absolute bottom-5 left-5 text-xs text-neutral-400">MVP · v0.1</p>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/pipeline" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
        O
      </span>
      CRM Oeiras360
    </Link>
  );
}
