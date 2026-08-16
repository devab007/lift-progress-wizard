import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function RestTimer({
  seconds,
  startedAt,
  onDone,
}: {
  seconds: number;
  startedAt: number;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !fired.current) {
        fired.current = true;
        if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
        onDone();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [seconds, startedAt, onDone]);

  const progress = seconds > 0 ? ((seconds - left) / seconds) * 100 : 100;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-6">
      <div className="glow-card mx-auto flex max-w-md items-center gap-4 rounded-2xl border border-secondary/40 bg-card px-4 py-3">
        <div className="relative size-12 shrink-0">
          <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="var(--muted)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 100.5} 100.5`}
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("workout.rest")}
          </p>
          <p className="font-display text-2xl font-extrabold tabular">
            {String(Math.floor(left / 60)).padStart(2, "0")}:
            {String(left % 60).padStart(2, "0")}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label={t("workout.skip")} onClick={onDone}>
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}