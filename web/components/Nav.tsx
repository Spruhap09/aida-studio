import type { ReactNode } from "react";
import Link from "next/link";

export function Nav({ active }: { active: "home" | "stitch" | "clay" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Aida
        </Link>
        <nav className="flex gap-6 text-sm">
          <NavLink href="/stitch" current={active === "stitch"}>
            Cross-stitch
          </NavLink>
          <NavLink href="/clay" current={active === "clay"}>
            Clay
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={current ? "text-thread" : "text-ink/70 hover:text-ink"}>
      {children}
    </Link>
  );
}
