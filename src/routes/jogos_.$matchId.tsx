import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users as UsersIcon,
  Trophy,
  Flag as Whistle,
  Goal,
  Clock,
  BarChart3,
} from "lucide-react";
import { TeamFlag } from "@/components/TeamFlag";
import { LoadingState, ErrorState } from "@/components/States";
import { getMatchDetails, type MatchDetailsDTO } from "@/lib/bolao.functions";
import { stageLabel, teamName, groupLabel } from "@/lib/labels";

export const Route = createFileRoute("/jogos_/$matchId")({
  head: () => ({
    meta: [
      { title: "Detalhes do jogo — Bolão Copa 2026" },
      { name: "description", content: "Detalhes completos do jogo da Copa do Mundo FIFA 2026." },
    ],
  }),
  component: MatchDetailPage,
});

function formatFullDate(iso?: string | null) {
  if (!iso) return "Data a confirmar";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso ?? "";
  }
}

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const fetchDetails = useServerFn(getMatchDetails);
  const { data, isLoading, error, refetch } = useQuery<MatchDetailsDTO>({
    queryKey: ["match-details", matchId],
    queryFn: () => fetchDetails({ data: { matchId: Number(matchId) } }),
  });

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Link
        to="/jogos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar para Jogos
      </Link>

      {isLoading ? (
        <LoadingState label="Carregando detalhes do jogo…" />
      ) : error ? (
        <ErrorState
          description={(error as Error).message}
          action={
            <button
              onClick={() => refetch()}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Tentar de novo
            </button>
          }
        />
      ) : data ? (
        <MatchDetail data={data} />
      ) : null}
    </section>
  );
}

function MatchDetail({ data }: { data: MatchDetailsDTO }) {
  const { match, extra, predictionsStats } = data;
  const home = teamName(match.homeTeamName, match.homeTeamCode);
  const away = teamName(match.awayTeamName, match.awayTeamCode);
  const venue = extra?.venue ?? match.venue ?? null;
  const referees = (extra?.referees ?? []).filter((r) => r.name);

  const status = match.status;
  const showScore = status !== "SCHEDULED" || match.homeScore !== null;

  return (
    <article className="space-y-6">
      {/* HERO */}
      <header className="sticker-frame relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-deep">
            {stageLabel(match.stage)}
          </span>
          {match.groupName && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {groupLabel(match.groupName)}
            </span>
          )}
          <span
            className={[
              "rounded-full px-2 py-0.5",
              status === "LIVE"
                ? "bg-destructive text-destructive-foreground"
                : status === "FINISHED"
                  ? "bg-brazil-green text-white"
                  : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {status === "LIVE"
              ? "Ao vivo"
              : status === "FINISHED"
                ? "Encerrado"
                : "Aguardando"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamFlag nameBr={home} countryCode={match.homeTeamCode} size="lg" />
            <h2 className="font-display text-base font-black leading-tight sm:text-xl">
              {home}
            </h2>
          </div>
          <div className="text-center">
            {showScore ? (
              <div className="font-display text-3xl font-black tabular-nums sm:text-5xl">
                {match.homeScore ?? "-"}
                <span className="mx-1 text-muted-foreground">×</span>
                {match.awayScore ?? "-"}
              </div>
            ) : (
              <div className="font-display text-3xl font-black text-muted-foreground sm:text-5xl">
                ×
              </div>
            )}
            {extra?.score?.halfTime &&
              (extra.score.halfTime.home !== null || extra.score.halfTime.away !== null) && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Intervalo: {extra.score.halfTime.home ?? "-"} × {extra.score.halfTime.away ?? "-"}
                </p>
              )}
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamFlag nameBr={away} countryCode={match.awayTeamCode} size="lg" />
            <h2 className="font-display text-base font-black leading-tight sm:text-xl">
              {away}
            </h2>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden /> {formatFullDate(match.kickoff)}
          </span>
          {venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {venue}
            </span>
          )}
          {extra?.attendance ? (
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" aria-hidden />{" "}
              {extra.attendance.toLocaleString("pt-BR")} torcedores
            </span>
          ) : null}
        </div>
      </header>

      {/* GOLS */}
      {extra?.goals && extra.goals.length > 0 && (
        <section className="sticker-frame p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Goal className="h-4 w-4" aria-hidden /> Gols
          </h3>
          <ol className="space-y-2 text-sm">
            {extra.goals.map((g, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md bg-muted px-1 text-[11px] font-bold tabular-nums">
                    {g.minute !== null ? `${g.minute}'` : "—"}
                  </span>
                  <span className="font-semibold">{g.scorer?.name ?? "—"}</span>
                  {g.assist?.name && (
                    <span className="text-xs text-muted-foreground">
                      assist: {g.assist.name}
                    </span>
                  )}
                </span>
                {g.score && (
                  <span className="font-display text-sm font-black tabular-nums">
                    {g.score.home ?? "-"} × {g.score.away ?? "-"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* INFO + ÁRBITROS */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="sticker-frame p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Trophy className="h-4 w-4" aria-hidden /> Informações do jogo
          </h3>
          <dl className="space-y-2 text-sm">
            <Info label="Fase" value={stageLabel(match.stage)} />
            {match.groupName && (
              <Info label="Grupo" value={groupLabel(match.groupName).replace(/^Grupo\s*/, "")} />
            )}
            {extra?.matchday != null && (
              <Info label="Rodada" value={String(extra.matchday)} />
            )}
            <Info label="Data" value={formatFullDate(match.kickoff)} />
            {venue && <Info label="Estádio" value={venue} />}
            {extra?.score?.duration && (
              <Info label="Duração" value={durationLabel(extra.score.duration)} />
            )}
            {extra?.score?.extraTime &&
              (extra.score.extraTime.home !== null || extra.score.extraTime.away !== null) && (
                <Info
                  label="Prorrogação"
                  value={`${extra.score.extraTime.home ?? "-"} × ${extra.score.extraTime.away ?? "-"}`}
                />
              )}
            {extra?.score?.penalties &&
              (extra.score.penalties.home !== null || extra.score.penalties.away !== null) && (
                <Info
                  label="Pênaltis"
                  value={`${extra.score.penalties.home ?? "-"} × ${extra.score.penalties.away ?? "-"}`}
                />
              )}
            {extra?.lastUpdated && (
              <Info
                label="Atualizado"
                value={new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(extra.lastUpdated))}
              />
            )}
          </dl>
        </section>

        <section className="sticker-frame p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Whistle className="h-4 w-4" aria-hidden /> Arbitragem
          </h3>
          {referees.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {referees.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold">{r.name}</span>
                    {r.type && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {refereeType(r.type)}
                      </span>
                    )}
                  </span>
                  {r.nationality && (
                    <span className="text-xs text-muted-foreground">{r.nationality}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Informações de arbitragem ainda não disponíveis.
            </p>
          )}
        </section>
      </div>

      {/* PALPITES DA GALERA */}
      <section className="sticker-frame p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4" aria-hidden /> O que a galera palpitou
        </h3>
        {predictionsStats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda ninguém palpitou neste jogo.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Baseado em <strong className="text-foreground">{predictionsStats.total}</strong>{" "}
              palpite(s).
            </p>
            <ResultBar
              total={predictionsStats.total}
              home={predictionsStats.homeWin}
              draw={predictionsStats.draw}
              away={predictionsStats.awayWin}
              homeLabel={home}
              awayLabel={away}
            />
            {predictionsStats.topScores.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Placares mais palpitados
                </p>
                <ul className="flex flex-wrap gap-2">
                  {predictionsStats.topScores.map((s) => (
                    <li
                      key={s.score}
                      className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold tabular-nums"
                    >
                      {s.score}
                      <span className="ml-2 text-muted-foreground">
                        {s.count}×
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {predictionsStats.averageHome !== null && predictionsStats.averageAway !== null && (
              <p className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" aria-hidden />
                Média de gols esperada: {predictionsStats.averageHome.toFixed(1)} ×{" "}
                {predictionsStats.averageAway.toFixed(1)}
              </p>
            )}
          </div>
        )}
      </section>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}

function ResultBar({
  total,
  home,
  draw,
  away,
  homeLabel,
  awayLabel,
}: {
  total: number;
  home: number;
  draw: number;
  away: number;
  homeLabel: string;
  awayLabel: string;
}) {
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const h = pct(home);
  const d = pct(draw);
  const a = pct(away);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {h > 0 && <div className="bg-brazil-green" style={{ width: `${h}%` }} />}
        {d > 0 && <div className="bg-muted-foreground/40" style={{ width: `${d}%` }} />}
        {a > 0 && <div className="bg-brazil-blue" style={{ width: `${a}%` }} />}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <span className="text-left">
          <strong>{h}%</strong>{" "}
          <span className="text-muted-foreground">{homeLabel}</span>
        </span>
        <span className="text-center">
          <strong>{d}%</strong>{" "}
          <span className="text-muted-foreground">Empate</span>
        </span>
        <span className="text-right">
          <strong>{a}%</strong>{" "}
          <span className="text-muted-foreground">{awayLabel}</span>
        </span>
      </div>
    </div>
  );
}

function durationLabel(d: string) {
  switch (d) {
    case "REGULAR":
      return "Tempo normal";
    case "EXTRA_TIME":
      return "Prorrogação";
    case "PENALTY_SHOOTOUT":
      return "Pênaltis";
    default:
      return d;
  }
}

function refereeType(t: string) {
  const map: Record<string, string> = {
    REFEREE: "Principal",
    ASSISTANT_REFEREE_N1: "Assistente 1",
    ASSISTANT_REFEREE_N2: "Assistente 2",
    FOURTH_OFFICIAL: "Quarto árbitro",
    VIDEO_ASSISTANT_REFEREE_N1: "VAR",
    VIDEO_ASSISTANT_REFEREE_N2: "AVAR",
  };
  return map[t] ?? t.replace(/_/g, " ").toLowerCase();
}
