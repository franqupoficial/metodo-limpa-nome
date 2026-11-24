/** Ilustração genérica (não representa veículo específico). */
export function CarIllustration({ category, className = "" }: { category: string; className?: string }) {
  const suv = /suv/i.test(category);
  const sedan = /sedan|comfort/i.test(category);
  const premium = /premium|eletr/i.test(category);
  const gid = `g-${category.replace(/[^a-zA-Z0-9]/g, "")}`;
  const body = premium ? "#0c6855" : suv ? "#124a93" : sedan ? "#33415c" : "#1a5bb0";
  return (
    <svg viewBox="0 0 320 180" className={className} role="img" aria-label={`Ilustração de veículo da categoria ${category}`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#eef4fc" />
          <stop offset="1" stopColor="#d8e5f7" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />
      <ellipse cx="160" cy="146" rx="120" ry="9" fill="#0b2d5a" opacity="0.12" />
      {suv ? (
        <path d="M40 128v-26c0-6 4-10 10-11l30-6 26-25c5-4 10-6 16-6h80c7 0 12 2 17 7l24 25 26 6c6 1 10 6 10 12v24z" fill={body} />
      ) : sedan ? (
        <path d="M32 130v-20c0-6 4-10 10-11l38-8 30-24c5-4 10-5 16-5h62c7 0 13 2 18 6l30 24 36 7c6 1 10 6 10 12v19z" fill={body} />
      ) : (
        <path d="M44 130v-22c0-7 5-12 12-13l26-5 28-26c5-4 10-6 16-6h56c7 0 13 3 17 8l22 24 22 5c7 2 12 7 12 14v21z" fill={body} />
      )}
      <path d={suv ? "M112 62h44v26H88zM166 62h38l22 26h-60z" : "M120 70h36v22H98zM166 70h34l22 22h-56z"} fill="#cfe0f5" opacity="0.9" />
      {premium && <path d="M150 104l-8 14h10l-4 12 14-18h-10l6-8z" fill="#f2b01e" />}
      <circle cx="94" cy="132" r="18" fill="#1b2433" /><circle cx="94" cy="132" r="8" fill="#9aa8bd" />
      <circle cx="230" cy="132" r="18" fill="#1b2433" /><circle cx="230" cy="132" r="8" fill="#9aa8bd" />
      <rect x="262" y="108" width="14" height="6" rx="3" fill="#f2b01e" />
    </svg>
  );
}
