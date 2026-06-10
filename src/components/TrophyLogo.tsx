import trophyImage from "@/assets/world-cup-trophy.png";

interface TrophyLogoProps {
  className?: string;
  /** Kept for compatibility — does not affect the transparent PNG. */
  variant?: "light" | "dark";
}

/**
 * Main bolão logo: World Cup trophy (transparent PNG).
 */
export function TrophyLogo({ className }: TrophyLogoProps) {
  return (
    <img
      src={trophyImage}
      alt="Taça da Copa do Mundo"
      loading="lazy"
      decoding="async"
      className={`trophy-hover ${className ?? ""}`}
      draggable={false}
    />
  );
}
