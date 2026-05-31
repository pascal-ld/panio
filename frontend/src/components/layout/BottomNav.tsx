"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/NavigationContext";
import type { NavItem } from "@/lib/roles";

function NavIcon({ icon, active }: { icon: NavItem["icon"]; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  const className = `h-6 w-6 ${active ? "text-primary" : "text-foreground/45"}`;

  switch (icon) {
    case "plus":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
        </svg>
      );
    case "list":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "shop":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9l9-6 9 6v11a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9z"
          />
        </svg>
      );
    case "harvest":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M3 10l2-4h14l2 4M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14h6" />
        </svg>
      );
    case "history":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "user":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    case "users":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
        </svg>
      );
  }
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            ((item.href !== "/producteur" && item.href !== "/client" && item.href !== "/admin/producteurs" && item.href !== "/admin/compte") &&
              pathname.startsWith(item.href));

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                onClick={() => {
                  if (!active) startNavigation();
                }}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition ${
                  active ? "text-primary" : "text-foreground/55"
                }`}
              >
                <NavIcon icon={item.icon} active={active} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
