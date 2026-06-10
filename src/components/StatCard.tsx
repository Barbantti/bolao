import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "purple" | "yellow" | "green" | "blue";
  className?: string;
  cta?: ReactNode;
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  purple: "from-accent-purple/20 to-accent-soft text-accent-deep",
  yellow: "from-brazil-yellow/40 to-brazil-yellow/10 text-foreground",
  green: "from-brazil-green/25 to-brazil-green/5 text-foreground",
  blue: "from-brazil-light/25 to-brazil-blue/10 text-foreground",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "purple", className, cta }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className={cn(
        "sticker-frame relative p-4 sm:p-5",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 -z-0 bg-gradient-to-br opacity-90",
          TONE[tone]
        )}
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
              {label}
            </p>
            <p className="mt-1 font-display text-3xl font-black tabular-nums text-shadow-sticker">
              {value}
            </p>
            {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
          </div>
          {Icon && (
            <span className="rounded-full bg-white/40 p-2 backdrop-blur">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          )}
        </div>
        {cta && <div className="mt-3">{cta}</div>}
      </div>
    </motion.div>
  );
}
