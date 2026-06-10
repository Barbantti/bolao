import { cn } from "@/lib/utils";
import { toFlagCode } from "@/lib/labels";

interface TeamFlagProps {
  countryCode?: string | null;
  nameBr: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-6 w-9 text-[10px]",
  md: "h-10 w-14 text-xs",
  lg: "h-14 w-20 text-sm",
} as const;

/**
 * Bandeira da seleção.
 * Usa CDN flagcdn.com quando há country_code ISO.
 * Fallback: placeholder acessível com iniciais do país em pt-BR.
 */
export function TeamFlag({ countryCode, nameBr, size = "md", className }: TeamFlagProps) {
  const sizeCls = SIZE_MAP[size];
  const initials = nameBr
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const code = toFlagCode(countryCode);
  if (code) {
    return (
      <img
        src={`https://flagcdn.com/w160/${code}.png`}
        srcSet={`https://flagcdn.com/w320/${code}.png 2x`}
        alt={`Bandeira de ${nameBr}`}
        loading="lazy"
        decoding="async"
        className={cn(
          "rounded-md object-cover ring-1 ring-border shadow-sm",
          sizeCls,
          className
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`Bandeira de ${nameBr}`}
      className={cn(
        "flex items-center justify-center rounded-md bg-muted font-bold uppercase text-muted-foreground ring-1 ring-border",
        sizeCls,
        className
      )}
    >
      {initials}
    </span>
  );
}
