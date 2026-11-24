export const metadata = { title: "Painel", robots: { index: false } };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin flex min-h-dvh items-center justify-center bg-[#0b0b0c] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif text-4xl tracking-[0.35em] text-[#c9a96e]">LUXER</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-zinc-500">Painel administrativo</div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-2xl">{children}</div>
      </div>
    </div>
  );
}
