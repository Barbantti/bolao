import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParticipant } from "@/hooks/use-participant";
import { createOrGetParticipant } from "@/lib/bolao.functions";

export const Route = createFileRoute("/participar")({
  head: () => ({
    meta: [
      { title: "Participar do bolão — Copa 2026" },
      {
        name: "description",
        content:
          "Entre no bolão com seu nome e e-mail. Sem senha, sem código — use o mesmo e-mail para recuperar seus palpites.",
      },
      { property: "og:url", content: "/participar" },
      { property: "og:title", content: "Participar do bolão — Copa 2026" },
      {
        property: "og:description",
        content: "Entre no bolão com seu nome e e-mail. Sem senha, sem código.",
      },
    ],
    links: [{ rel: "canonical", href: "/participar" }],
  }),
  component: ParticiparPage,
});

function ParticiparPage() {
  const navigate = useNavigate();
  const { participant, hydrated, save } = useParticipant();
  const register = useServerFn(createOrGetParticipant);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Se o participante já está autenticado localmente, manda direto pros palpites.
  useEffect(() => {
    if (hydrated && participant) {
      navigate({ to: "/palpites", replace: true });
    }
  }, [hydrated, participant, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const p = await register({ data: { name: name.trim(), email: email.trim() } });
      save({ id: p.id, name: p.name, email: p.email });
      toast.success(`Bem-vindo, ${p.name.split(" ")[0]}!`, {
        description: "Agora você pode preencher seus palpites.",
      });
      navigate({ to: "/palpites" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Não foi possível entrar", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep">
          <Mail className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-black">Participar do bolão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use seu e-mail para entrar. Sem senha, sem código.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticker-frame space-y-4 p-6"
        aria-label="Cadastro no bolão"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Seu nome</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Ana Souza"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            autoComplete="email"
            maxLength={255}
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Use sempre o mesmo e-mail para recuperar seus palpites.
          </p>
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar no bolão"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" aria-hidden />}
        </Button>
      </form>
    </section>
  );
}
