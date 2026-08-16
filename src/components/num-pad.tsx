import { Delete } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NumPadProps = {
  value: string;
  onChange: (next: string) => void;
  allowDecimal?: boolean;
  className?: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function NumPad({ value, onChange, allowDecimal = false, className }: NumPadProps) {
  const press = (key: string) => {
    if (navigator.vibrate) navigator.vibrate(8);
    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && (!allowDecimal || value.includes("."))) return;
    if (value.length >= 6) return;
    onChange(value === "0" && key !== "." ? key : value + key);
  };

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {KEYS.map((key) => (
        <PadButton key={key} onClick={() => press(key)}>
          {key}
        </PadButton>
      ))}
      <PadButton onClick={() => press(".")} disabled={!allowDecimal}>
        ,
      </PadButton>
      <PadButton onClick={() => press("0")}>0</PadButton>
      <PadButton onClick={() => press("del")} aria-label="delete">
        <Delete className="mx-auto size-6" />
      </PadButton>
    </div>
  );
}

function PadButton({
  children,
  ...props
}: React.ComponentProps<"button"> & { children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-14 rounded-xl bg-muted font-display text-2xl font-bold text-foreground active:scale-95 disabled:opacity-30"
      {...props}
    >
      {children}
    </Button>
  );
}