"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useNavigation } from "@/contexts/NavigationContext";

type AppLinkProps = ComponentProps<typeof Link>;

function normalizeHref(href: AppLinkProps["href"]): string {
  if (typeof href === "string") {
    return href.split("?")[0].split("#")[0] || "/";
  }
  return href.pathname ?? "/";
}

export function AppLink({ href, onClick, ...props }: AppLinkProps) {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  const target = normalizeHref(href);

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (target && target !== pathname) {
          startNavigation();
        }
      }}
      {...props}
    />
  );
}
