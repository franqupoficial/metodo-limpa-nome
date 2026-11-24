import { CarIllustration } from "./CarIllustration";

export function VehicleImage({ url, category, caption, className = "aspect-[16/9]" }: { url: string | null; category: string; caption: string; className?: string }) {
  return (
    <figure className={`relative overflow-hidden bg-brand-50 ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={caption} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <CarIllustration category={category} className="h-full w-full" />
      )}
      <figcaption className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">{caption}</figcaption>
    </figure>
  );
}
