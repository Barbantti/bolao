import { motion } from "framer-motion";
import { TeamFlag } from "./TeamFlag";
import { cn } from "@/lib/utils";
import { stageLabel, groupLabel } from "@/lib/labels";
import { Lock, Radio, CheckCircle2, Clock } from "lucide-react";

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "LOCKED";

export interface MatchCardData {
  id: string;
  stage: string;
  groupCode?: string | null;
  startsAt?: string | null;
  venue?: string | null;
  status: MatchStatus;
  home: { nameBr: string; countryCode?: string | null };
  away: { nameBr: string; countryCode?: string | null };
  homeScore?: number | null;
  awayScore?: number | null;
}

interface MatchCardProps {
  match: MatchCardData;
  /** Slot para inputs de palpite (PredictionInput) */
  children?: React.ReactNode;
  rare?: boolean;
  className?: string;
}

const STATUS_LABEL: Record<MatchStatus, { label: string; cls: string; Icon: typeof Lock }> = {
  SCHEDULED: { label: "Aguardando", cls: "bg-muted text-muted-foreground", Icon: Clock },
  LIVE: { label: "Ao vivo", cls: "bg-destructive text-destructive-foreground", Icon: Radio },
  FINISHED: { label: "Encerrado", cls: "bg-brazil-green text-white", Icon: CheckCircle2 },
  LOCKED: { label: "Palpite bloqueado", cls: "bg-foreground text-background", Icon: Lock },
};

function formatBR(iso?: string | null) {
  if (!iso) return "Data a confirmar";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MatchCard({ match, children, rare = false, className }: MatchCardProps) {
  const status = STATUS_LABEL[match.status];
  const StatusIcon = status.Icon;
  const showScore = match.status === "LIVE" || match.status === "FINISHED";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        "sticker-frame holo-shine p-4 sm:p-5",
        rare && "sticker-rare",
        className
      )}
    >
      {/* Selo de status + selo de grupo/fase */}
      <header className="relative z-10 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            "bg-accent-soft text-accent-deep",
            rare && "bg-white/15 text-white"
          )}
        >
          {match.groupCode ? groupLabel(match.groupCode) : stageLabel(match.stage)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            status.cls
          )}
          aria-label={`Status: ${status.label}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden />
          {status.label}
        </span>
      </header>

      {/* Confronto */}
      <div className="relative z-10 mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamFlag nameBr={match.home.nameBr} countryCode={match.home.countryCode} size="lg" />
          <span className={cn("text-sm font-semibold leading-tight", rare && "text-white")}>
            {match.home.nameBr}
          </span>
        </div>

        <div
          className={cn(
            "flex flex-col items-center gap-0.5 px-2",
            rare ? "text-white" : "text-foreground"
          )}
        >
          {showScore ? (
            <div className="font-display text-3xl font-black tabular-nums text-shadow-sticker">
              {match.homeScore ?? 0}
              <span className="mx-1 opacity-60">×</span>
              {match.awayScore ?? 0}
            </div>
          ) : (
            <div className="font-display text-2xl font-black opacity-60">×</div>
          )}
          <div className={cn("text-[10px] uppercase tracking-wider opacity-70")}>
            {formatBR(match.startsAt)}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <TeamFlag nameBr={match.away.nameBr} countryCode={match.away.countryCode} size="lg" />
          <span className={cn("text-sm font-semibold leading-tight", rare && "text-white")}>
            {match.away.nameBr}
          </span>
        </div>
      </div>

      {match.venue && (
        <p className={cn("relative z-10 mt-2 text-center text-[11px]", rare ? "text-white/70" : "text-muted-foreground")}>
          {match.venue}
        </p>
      )}

      {children && <div className="relative z-10 mt-4">{children}</div>}
    </motion.article>
  );
}
