import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { useAuthUser, useSettings, useSubscription, useUpdateSettings } from "@/hooks/use-grind-data";
import { daysLeft, type ProgressionStyle } from "@/lib/grind";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

const STYLES: ProgressionStyle[] = ["conservateur", "modere", "agressif"];
const GOALS = ["priseDeMasse", "seche", "maintien"] as const;

function SettingsPage() {
  const { t, setLang } = useI18n();
  const { userId, email } = useAuthUser();
  const { data: settings } = useSettings(userId);
  const { data: subscription } = useSubscription(userId);
  const update = useUpdateSettings(userId);

  const [form, setForm] = useState({
    lang: "fr",
    unit_preference: "kg",
    progression_style: "modere" as ProgressionStyle,
    goal: "maintien",
    target_body_weight: "",
    rest_timer_seconds: "90",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      lang: settings.lang,
      unit_preference: settings.unit_preference,
      progression_style: settings.progression_style,
      goal: settings.goal,
      target_body_weight: settings.target_body_weight ? String(settings.target_body_weight) : "",
      rest_timer_seconds: String(settings.rest_timer_seconds),
    });
  }, [settings]);

  const save = () => {
    update.mutate(
      {
        lang: form.lang,
        unit_preference: form.unit_preference,
        progression_style: form.progression_style,
        goal: form.goal,
        target_body_weight: form.target_body_weight ? Number(form.target_body_weight) : null,
        rest_timer_seconds: Number(form.rest_timer_seconds) || 90,
      },
      {
        onSuccess: () => {
          setLang(form.lang as Lang);
          toast.success(t("settings.saved"));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="text-3xl font-extrabold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("settings.lang")}</Label>
          <Select value={form.lang} onValueChange={(value) => setForm({ ...form, lang: value })}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("settings.unit")}</Label>
          <Select
            value={form.unit_preference}
            onValueChange={(value) => setForm({ ...form, unit_preference: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="lb">lb</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("settings.progression")}</Label>
          <Select
            value={form.progression_style}
            onValueChange={(value) =>
              setForm({ ...form, progression_style: value as ProgressionStyle })
            }
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t("settings." + item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("settings.goal")}</Label>
          <Select value={form.goal} onValueChange={(value) => setForm({ ...form, goal: value })}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOALS.map((item) => (
                <SelectItem key={item} value={item === "priseDeMasse" ? "prise_de_masse" : item}>
                  {t("settings." + item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">{t("settings.targetWeight")}</Label>
          <Input
            id="target"
            inputMode="decimal"
            value={form.target_body_weight}
            onChange={(e) =>
              setForm({ ...form, target_body_weight: e.target.value.replace(",", ".") })
            }
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rest">{t("settings.restTimer")}</Label>
          <Input
            id="rest"
            inputMode="numeric"
            value={form.rest_timer_seconds}
            onChange={(e) => setForm({ ...form, rest_timer_seconds: e.target.value })}
            className="h-12"
          />
        </div>
      </div>

      <Button className="h-12 w-full font-bold sm:w-auto sm:px-8" onClick={save}>
        {t("common.save")}
      </Button>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-lg font-bold">{t("settings.subscription")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {subscription?.status === "trialing"
            ? daysLeft(subscription.trial_ends_at) > 0
              ? t("trial.left", { n: daysLeft(subscription.trial_ends_at) })
              : t("trial.over")
            : (subscription?.status ?? "—")}
        </p>
      </div>
    </div>
  );
}