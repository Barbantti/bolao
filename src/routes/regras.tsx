import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Target, Trophy, Calculator } from "lucide-react";

export const Route = createFileRoute("/regras")({
  head: () => ({
    meta: [
      { title: "Regras do bolão — Bolão Copa 2026" },
      {
        name: "description",
        content: "Como funciona a pontuação e os critérios de desempate do Bolão Copa 2026.",
      },
      { property: "og:url", content: "/regras" },
      { property: "og:title", content: "Regras do bolão — Bolão Copa 2026" },
      { property: "og:description", content: "Pontuação 5/3/1/0 e critérios de desempate." },
    ],
    links: [{ rel: "canonical", href: "/regras" }],
  }),
  component: RegrasPage,
});

const SCORING = [
  { points: 5, label: "Placar exato", desc: "Cravou os dois placares.", icon: Target },
  { points: 3, label: "Vencedor + saldo", desc: "Acertou quem ganhou e a diferença de gols.", icon: Trophy },
  { points: 1, label: "Só o vencedor", desc: "Acertou quem ganhou (ou empate), mas errou o saldo.", icon: Calculator },
  { points: 0, label: "Errou tudo", desc: "Aí o próximo jogo dá pra recuperar.", icon: BookOpen },
];

function RegrasPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-black sm:text-4xl">Regras do bolão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Linguagem simples, pra você focar no que importa: cravar o placar do Brasil.
        </p>
      </header>

      <h2 className="mb-3 font-display text-xl font-bold">Pontuação</h2>
      <ul className="mb-10 grid gap-3 sm:grid-cols-2">
        {SCORING.map((s) => (
          <li key={s.label} className="sticker-frame p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-deep">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-2xl font-black tabular-nums">
                  {s.points}
                  <span className="ml-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    pts
                  </span>
                </p>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 font-display text-xl font-bold">Critérios de desempate</h2>
      <ol className="sticker-frame list-decimal space-y-2 p-6 pl-10 text-sm">
        <li>Maior número de placares exatos.</li>
        <li>Maior número de resultados corretos.</li>
        <li>Maior número de palpites feitos.</li>
        <li>Ordem alfabética por nome.</li>
      </ol>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold">Regrinhas extras</h2>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>• Você pode editar seus palpites até a bola rolar. Depois do apito inicial, o palpite vira figurinha colada.</li>
        <li>• O acesso é por email simples. Use sempre o mesmo email — quem souber pode ver seus palpites.</li>
        <li>• Resultados oficiais são sincronizados por uma API gratuita. Quando ainda não houver dado oficial, o admin pode cadastrar manualmente, sempre rotulado como tal.</li>
        <li>• Ranking atualiza automaticamente.</li>
      </ul>
    </section>
  );
}
