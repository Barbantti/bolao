import { cn } from "@/lib/utils";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";

export function LoadingState({ label = "Carregando…", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground", className)}
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sticker-frame flex flex-col items-center gap-3 p-8 text-center", className)}>
      <span className="rounded-full bg-accent-soft p-3 text-accent-deep">
        <Inbox className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Algo deu errado",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("sticker-frame flex flex-col items-center gap-3 p-8 text-center", className)}
    >
      <span className="rounded-full bg-destructive/15 p-3 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
