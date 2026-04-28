"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useSession } from "next-auth/react";
import { isAdminRole } from "@/lib/rbac";
import { useI18n } from "@/components/i18n/I18nProvider";

const links = [
  { href: "/", labelKey: "nav.stress_test" as const },
  { href: "/copywriter", labelKey: "nav.copywriter" as const },
  { href: "/profile", labelKey: "nav.profile" as const },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();
  const allLinks = isAdminRole(session?.user?.roles)
    ? [
        ...links, 
        { href: "/admin/users", labelKey: "nav.users" as const },
        { href: "/admin/personas", labelKey: "nav.personas" as const }
      ]
    : links;

  return (
    <nav aria-label={t("nav.main_aria")} className="rounded-xl border border-white/10 bg-[#0f0f10] p-2 lg:p-3">
      <ul className="flex flex-col gap-1 lg:gap-2">
        {allLinks.map((link) => {
          const isActive =
            link.href === "/profile"
              ? pathname?.startsWith("/profile")
              : pathname === link.href;

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={clsx(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[#4F46E5]/20 text-[#ededed]"
                    : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#ededed]"
                )}
              >
                {t(link.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
