import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#124a93" />
      <path d="M11 29V11h9.5a6 6 0 0 1 0 12H15" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28.5" cy="28.5" r="3.2" fill="#f2b01e" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="Portal Consumidor — página inicial">
      <LogoMark />
      <span className="leading-tight">
        <span className={`block text-[17px] font-extrabold tracking-tight ${light ? "text-white" : "text-brand-900"}`}>Portal Consumidor</span>
        <span className={`block text-[11px] font-medium ${light ? "text-brand-100" : "text-muted"}`}>Informação, orientação e serviços digitais</span>
      </span>
    </Link>
  );
}

export function LvbMark({ className = "h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 92 36" className={className} role="img" aria-label="LVB Locação de Veículos">
      <rect width="92" height="36" rx="8" fill="#0c6855" />
      <text x="12" y="25" fontFamily="Inter, Segoe UI, sans-serif" fontSize="19" fontWeight="900" fill="#fff" letterSpacing="1">LVB</text>
      <path d="M58 22h22M62 22l3-7h10l3 7" stroke="#f2b01e" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="64" cy="24" r="2.4" fill="#f2b01e" />
      <circle cx="75" cy="24" r="2.4" fill="#f2b01e" />
    </svg>
  );
}
