import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Trophy,
  Target,
  Star,
  Goal as GoalIcon,
  CalendarDays,
  Sparkles,
  Users,
} from "lucide-react";
import { TeamFlag } from "@/components/TeamFlag";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { getLeaderDetails, type LeaderDetails } from "@/lib/bolao.functions";
import { teamName } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lider")({
  head: () => ({
    meta: [
      { title: "Líder atual — Bolão Copa 2026" },
      {
        name: "description",
        content:
          "Perfil completo do líder do Bolão Copa 2026: pontos, palpites e estatísticas em tempo real.",
      },
      { property: "og:title", content: "Líder atual — Bolão Copa 2026" },
      {
        property: "og:description",
        content: "Veja tudo sobre quem está no topo do bolão da Copa 2026.",
      },
      { property: "og:url", content: "/lider" },
    ],
    links: [{ rel: "canonical", href: "/lider" }],
  }),
  component: LeaderPage,
});

function formatDate(iso?: string | null, withTime = true) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LeaderPage() {
  const fetchLeader = useServerFn(getLeaderDetails);
  const { data, isLoading, error, refetch } = useQuery<LeaderDetails>({
    queryKey: ["leader-details"],
    queryFn: () => fetchLeader(),
    staleTime: 30_000,
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar para o início
      </Link>

      {isLoading ? (
        <LoadingState label="Carregando perfil do líder…" />
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
      ) : !data?.leader ? (
        <EmptyState
          title="Ainda sem líder"
          description="Assim que os primeiros jogos forem encerrados e os palpites pontuarem, o líder aparecerá aqui."
          action={
            <Link
              to="/ranking"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Ver ranking
            </Link>
          }
        />
      ) : (
        <LeaderContent data={data} />
      )}
    </section>
  );
}

function LeaderContent({ data }: { data: LeaderDetails }) {
  const leader = data.leader!;
  return (
    <>
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="sticker-frame relative overflow-hidden p-6 sm:p-10"
      >
        <div
          className="absolute inset-0 -z-0 bg-gradient-to-br from-sticker-gold via-yellow-400 to-amber-500 opacity-95"
          aria-hidden
        />
        <div className="dotted-bg absolute inset-0 -z-0 opacity-20" aria-hidden />
        <div className="relative z-10 flex flex-col items-center text-center text-yellow-950">
          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-950/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            <Crown className="h-3.5 w-3.5" aria-hidden /> Líder do bolão
          </span>
          <h1 className="mt-4 font-display text-4xl font-black leading-tight text-shadow-sticker sm:text-6xl">
            {leader.name}
          </h1>
          <p className="mt-1 text-xs font-medium opacity-80">{leader.emailMasked}</p>

          <div className="mt-6 flex items-end gap-2">
            <span className="font-display text-7xl font-black tabular-nums leading-none">
              {leader.totalPoints}
            </span>
            <span className="mb-2 text-sm font-bold uppercase tracking-wider opacity-80">
              pontos
            </span>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider opacity-80">
            #{leader.position} no ranking · desde {formatDate(leader.createdAt, false)}
          </p>
        </div>
      </motion.div>

      {/* STATS */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Star} label="Placares exatos" value={leader.exactCount} hint="5 pts cada" />
        <StatTile icon={Target} label="Vencedor + saldo" value={leader.resultCount} hint="3 pts cada" />
        <StatTile icon={GoalIcon} label="Só vencedor" value={leader.goalCount} hint="1 pt cada" />
        <StatTile icon={Trophy} label="Palpites feitos" value={leader.predictionsCount} hint="no total" />
      </div>

      {/* PREDICTIONS */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-black sm:text-3xl">Palpites recentes</h2>
          <Link to="/ranking" className="text-sm font-semibold text-accent-purple hover:underline">
            Ver ranking →
          </Link>
        </div>
        {data.recentPredictions.length === 0 ? (
          <div className="sticker-frame p-6 text-center text-sm text-muted-foreground">
            O líder ainda não registrou palpites.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.recentPredictions.map((p) => (
              <li key={p.id}>
                <Link
                  to="/jogos/$matchId"
                  params={{ matchId: String(p.matchId) }}
                  className="sticker-frame block p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" aria-hidden />
                      {formatDate(p.kickoff)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        p.scored
                          ? p.points >= 5
                            ? "bg-sticker-gold/40 text-yellow-900"
                            : p.points >= 3
                              ? "bg-brazil-green/30 text-brazil-green"
                              : p.points >= 1
                                ? "bg-brazil-light/30 text-brazil-blue"
                                : "bg-muted text-muted-foreground"
                          : "bg-accent-soft text-accent-deep",
                      )}
                    >
                      {p.scored ? `${p.points} pt${p.points === 1 ? "" : "s"}` : p.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <TeamMini name={teamName(p.homeTeamName, p.homeTeamCode)} code={p.homeTeamCode} />
                    <ScoreBlock
                      pred={`${p.predHome} × ${p.predAway}`}
                      actual={
                        p.homeScore !== null && p.awayScore !== null
                          ? `${p.homeScore} × ${p.awayScore}`
                          : null
                      }
                    />
                    <TeamMini name={teamName(p.awayTeamName, p.awayTeamCode)} code={p.awayTeamCode} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* COMPETITION */}
      {data.competition && (
        <section className="mt-10 sticker-frame p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {data.competition.emblem && (
              <img
                src={data.competition.emblem}
                alt={data.competition.name}
                className="h-14 w-14 rounded-lg bg-white object-contain p-1"
                loading="lazy"
              />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Competição
              </p>
              <h2 className="font-display text-xl font-black sm:text-2xl">
                {data.competition.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {formatDate(data.competition.startDate, false)} —{" "}
                {formatDate(data.competition.endDate, false)}
                {data.competition.currentMatchday
                  ? ` · Rodada ${data.competition.currentMatchday}`
                  : ""}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TOP SCORERS */}
      {data.topScorers.length > 0 && (
        <section className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sticker-gold" aria-hidden />
            <h2 className="font-display text-2xl font-black sm:text-3xl">Artilharia da Copa</h2>
          </div>
          <div className="sticker-frame overflow-x-auto p-0">
            <table className="w-full min-w-[460px] text-xs sm:text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Jogador</th>
                  <th className="px-3 py-2 text-left">Seleção</th>
                  <th className="px-3 py-2 text-right">Gols</th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">Jogos</th>
                </tr>
              </thead>
              <tbody>
                {data.topScorers.map((s, i) => (
                  <tr key={`${s.playerName}-${i}`} className="border-t">
                    <td className="px-3 py-2 font-mono font-bold text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{s.playerName}</div>
                      {s.nationality && (
                        <div className="text-[10px] text-muted-foreground sm:text-xs">
                          {s.nationality}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {s.teamCrest && (
                          <img
                            src={s.teamCrest}
                            alt=""
                            className="h-5 w-5 object-contain"
                            loading="lazy"
                          />
                        )}
                        <span className="truncate">{s.teamName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-display text-base font-black tabular-nums">
                      {s.goals}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                      {s.playedMatches ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Dados de artilharia e competição via football-data.org.
          </p>
        </section>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/ranking"
          className="inline-flex items-center gap-1 rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
        >
          <Users className="h-4 w-4" aria-hidden />
          Ver ranking completo
        </Link>
        <Link
          to="/jogos"
          className="inline-flex items-center gap-1 rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          Ver todos os jogos
        </Link>
      </div>
    </>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Star;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="sticker-frame p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        <span className="rounded-full bg-accent-soft p-2 text-accent-deep">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function TeamMini({ name, code }: { name: string; code: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <TeamFlag nameBr={name} countryCode={code} size="sm" />
      <span className="text-[11px] font-semibold leading-tight">{name}</span>
    </div>
  );
}

function ScoreBlock({ pred, actual }: { pred: string; actual: string | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-display text-base font-black tabular-nums">{pred}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        palpite
      </span>
      {actual && (
        <span className="mt-1 text-[10px] font-semibold text-foreground">real: {actual}</span>
      )}
    </div>
  );
}
