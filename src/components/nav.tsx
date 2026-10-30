"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Inicio", icon: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/estudios", label: "Estudios", icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" },
  { href: "/subir", label: "Subir", icon: "M12 5v14M5 12h14", primary: true },
  { href: "/medicos", label: "Médicos", icon: "M8 3v5a4 4 0 008 0V3M12 12v3a5 5 0 0010 0v-2M22 11a1 1 0 11-2 0 1 1 0 012 0" },
  { href: "/familia", label: "Familia", icon: "M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={d} />
    </svg>
  );
}

export function Nav({ familyName }: { familyName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">+</span>
            <span>LeiboMedic</span>
            <span className="hidden text-sm font-normal text-slate-400 sm:inline">· {familyName}</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.primary
                    ? "btn-primary ml-2"
                    : `rounded-lg px-3 py-2 text-sm font-medium ${isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                {item.primary ? "+ Subir estudio" : item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                item.primary ? "text-brand-700" : isActive(item.href) ? "text-brand-700" : "text-slate-500"
              }`}
            >
              {item.primary ? (
                <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
                  <Icon d={item.icon} />
                </span>
              ) : (
                <Icon d={item.icon} />
              )}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
