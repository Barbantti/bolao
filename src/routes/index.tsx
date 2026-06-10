import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  CalendarDays,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { TrophyLogo } from "@/components/TrophyLogo";
import { StatCard } from "@/components/StatCard";
import { TeamFlag } from "@/components/TeamFlag";
import { Button } from "@/components/ui/button";
import { getHomeStats, type HomeStats } from "@/lib/bolao.functions";
import { stageLabel, teamName } from "@/lib/labels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão Copa 2026 — Copa do Mundo FIFA 2026" },
      {
        name: "description",
        content: "Participe do Bolão Copa 2026. Faça seus palpites e dispute o pódio dos craques.",
      },
      { property: "og:title", content: "Bolão Copa 2026 — Copa do Mundo FIFA 2026" },
      {
        property: "og:description",
        content: "Cadastre-se com seu email, palpite os 104 jogos e suba no ranking em tempo real.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

function formatShortDate(iso: string) {
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

function formatFullDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LandingPage() {
  const fetchHomeStats = useServerFn(getHomeStats);
  const { data, isLoading } = useQuery<HomeStats>({
    queryKey: ["home-stats"],
    queryFn: () => fetchHomeStats(),
    staleTime: 60_000,
  });

  const nextMatchValue = data?.nextMatch
    ? `${data.nextMatch.homeTeamCode ?? "?"} × ${data.nextMatch.awayTeamCode ?? "?"}`
    : isLoading
      ? "…"
      : "—";
  const nextMatchHint = data?.nextMatch
    ? formatShortDate(data.nextMatch.kickoff)
    : isLoading
      ? "Carregando…"
      : "Sem jogos agendados";

  const leaderValue = data?.leader?.name ? data.leader.name.split(" ")[0] : isLoading ? "…" : "—";
  const leaderHint = data?.leader
    ? `${data.leader.totalPoints} pts`
    : isLoading
      ? "Carregando…"
      : "Aguardando palpites";

  const participantsValue = isLoading ? "…" : String(data?.participantsCount ?? 0);
  const totalMatches = data?.totalMatches ?? 104;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-hero absolute inset-0 -z-10" aria-hidden />
        <div className="dotted-bg absolute inset-0 -z-10 opacity-30" aria-hidden />
        <div
          className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-brazil-yellow/30 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-24 -left-24 -z-10 h-96 w-96 rounded-full bg-brazil-green/30 blur-3xl"
          aria-hidden
        />

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pb-16 pt-12 text-center sm:pt-20 md:pb-24">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="rounded-2xl"
          >
            <TrophyLogo className="h-14 w-auto sm:h-16" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Bolão interno • 2026
            </span>
            <h1 className="font-display text-4xl font-black leading-tight text-white text-shadow-sticker sm:text-6xl">
              Bolão Copa 2026
              <br />
              <span className="bg-gradient-to-r from-brazil-yellow via-white to-brazil-green bg-clip-text text-transparent">
                Copa do Mundo FIFA 2026
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-base text-accent-soft/90 sm:text-lg">
              48 seleções. 104 jogos. Faça seus palpites e dispute o título com a galera.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button asChild variant="hero" size="xl">
              <Link to="/participar">
                Participar do bolão
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="stage"
              size="lg"
              className="bg-white/10 backdrop-blur hover:bg-white/20"
            >
              <Link to="/ranking">Ver ranking</Link>
            </Button>
          </motion.div>

          <p className="max-w-md text-xs text-accent-soft/70">
            Acesso simples por email — sem senha, sem cadastro chato. Use sempre o mesmo email para
            recuperar seus palpites depois.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Participantes"
            value={participantsValue}
            hint={data?.participantsCount === 0 ? "Seja o primeiro!" : "Cadastrados"}
            icon={Users}
            tone="purple"
            cta={<StatCta to="/ranking" label="Ver participantes" />}
          />
          <StatCard
            label="Jogos cadastrados"
            value={totalMatches}
            hint="Total da Copa"
            icon={CalendarDays}
            tone="blue"
            cta={<StatCta to="/jogos" label="Ver jogos" />}
          />
          <StatCard
            label="Próximo jogo"
            value={nextMatchValue}
            hint={nextMatchHint}
            icon={Sparkles}
            tone="yellow"
            cta={
              data?.nextMatch ? (
                <StatCta
                  to="/jogos/$matchId"
                  params={{ matchId: String(data.nextMatch.id) }}
                  label="Ver jogo"
                />
              ) : undefined
            }
          />
          <StatCard
            label="Líder atual"
            value={leaderValue}
            hint={leaderHint}
            icon={Trophy}
            tone="green"
            cta={data?.leader ? <StatCta to="/lider" label="Ver líder" /> : undefined}
          />
        </div>
      </section>

      {/* CALENDÁRIO DO BRASIL */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brazil-green/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brazil-green">
              <span aria-hidden>🇧🇷</span> Seleção brasileira
            </span>
            <h2 className="mt-2 font-display text-3xl font-black sm:text-4xl">
              Próximos jogos do Brasil
            </h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/jogos">Ver todos os jogos</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="sticker-frame h-28 w-[260px] flex-shrink-0 animate-pulse bg-muted/40 sm:w-[300px]"
                aria-hidden
              />
            ))}
          </div>
        ) : data && data.brazilNextMatches.length > 0 ? (
          <BrazilCarousel matches={data.brazilNextMatches} />
        ) : (
          <div className="sticker-frame p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum próximo jogo do Brasil agendado no momento.
            </p>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            Este bolão usa acesso simples por email para facilitar o uso interno. Não compartilhe
            seu email de participação com terceiros.
          </p>
          <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Admin
          </Link>
        </div>
      </footer>
    </>
  );
}

type StatCtaProps =
  | { to: "/jogos/$matchId"; params: { matchId: string }; label: string }
  | { to: "/ranking" | "/jogos" | "/lider"; params?: undefined; label: string };

function StatCta(props: StatCtaProps) {
  const linkProps =
    props.to === "/jogos/$matchId" ? { to: props.to, params: props.params } : { to: props.to };
  return (
    <Link
      {...linkProps}
      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-bold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white"
    >
      {props.label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

function BrazilCarousel({ matches }: { matches: HomeStats["brazilNextMatches"] }) {
  // Duplicamos a lista para criar a ilusão de loop infinito contínuo.
  const loop = [...matches, ...matches];
  // Velocidade lenta e proporcional à quantidade de cards (≈ 10s por card, mínimo 40s).
  const duration = Math.max(40, matches.length * 10);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className="marquee-track flex w-max gap-3 sm:gap-4"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {loop.map((m, i) => (
          <Link
            key={`${m.id}-${i}`}
            to="/jogos/$matchId"
            params={{ matchId: String(m.id) }}
            aria-hidden={i >= matches.length ? true : undefined}
            tabIndex={i >= matches.length ? -1 : undefined}
            className="sticker-frame relative block w-[260px] flex-shrink-0 overflow-hidden p-4 transition-transform hover:-translate-y-1 hover:shadow-lg sm:w-[300px]"
          >
            <header className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-deep">
                {stageLabel(m.stage)}
              </span>
              <span className="truncate text-muted-foreground">{formatFullDate(m.kickoff)}</span>
            </header>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex flex-col items-center gap-1 text-center">
                <TeamFlag
                  nameBr={teamName(m.homeTeamName, m.homeTeamCode)}
                  countryCode={m.homeTeamCode}
                  size="md"
                />
                <span className="text-xs font-semibold leading-tight">
                  {teamName(m.homeTeamName, m.homeTeamCode)}
                </span>
              </div>
              <span className="font-display text-xl font-black text-muted-foreground">×</span>
              <div className="flex flex-col items-center gap-1 text-center">
                <TeamFlag
                  nameBr={teamName(m.awayTeamName, m.awayTeamCode)}
                  countryCode={m.awayTeamCode}
                  size="md"
                />
                <span className="text-xs font-semibold leading-tight">
                  {teamName(m.awayTeamName, m.awayTeamCode)}
                </span>
              </div>
            </div>
            {m.venue && (
              <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                <span className="truncate">{m.venue}</span>
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
