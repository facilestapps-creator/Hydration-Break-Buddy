import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Play, ArrowLeft } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Switch } from "./Switch";
import { Button } from "./Button";
import { BREAK_TYPES, BreakType } from "@/lib/breaks";
import { cn } from "@/lib/utils";

export function SetupConfig({ onStart, onBack }: { onStart: () => void; onBack?: () => void }) {
  const { t } = useTranslation();

  const [workInterval, setWorkInterval] = useLocalStorage("bb-interval", 25);
  const [enabledBreaks, setEnabledBreaks] = useLocalStorage<BreakType[]>("bb-breaks", ["hydration", "walk", "eye"]);
  const [notifications, setNotifications] = useLocalStorage("bb-notifications", false);

  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;

  const toggleBreakType = (type: BreakType) => {
    setEnabledBreaks((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter((b) => b !== type);
      }
      return [...prev, type];
    });
  };

  const handleStart = () => {
    if (notifications && notificationsSupported && Notification.permission !== "granted") {
      Notification.requestPermission().then(() => onStart());
    } else {
      onStart();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 lg:p-8 bg-background relative overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-5 rounded-[2.5rem] border-2 border-border shadow-sm z-10"
      >
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("onboarding.back")}
          </button>
        )}

        <div className="text-center mb-3">
          <h2 className="text-2xl font-black text-foreground mb-1">{t("setup.title")}</h2>
          <p className="text-muted-foreground font-medium">{t("setup.subtitle")}</p>
        </div>

        <div className="space-y-3">
          {/* Work Interval */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {t("settings.interval")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 25, 45, 60].map((min) => (
                <button
                  key={min}
                  onClick={() => setWorkInterval(min)}
                  className={cn(
                    "py-2 rounded-2xl font-bold transition-all border-2 cursor-pointer",
                    workInterval === min
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_0_hsl(24,95%,45%)]"
                      : "border-border bg-transparent text-muted-foreground hover:bg-black/5 hover:border-muted-foreground/30"
                  )}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>

          {/* Enabled Breaks */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {t("settings.enabledBreaks")}
            </label>
            <div className="space-y-1.5">
              {Object.values(BREAK_TYPES).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl border-2 border-border bg-white"
                >
                  <div className="flex items-center gap-3 font-bold text-foreground">
                    <span className="text-2xl" role="img" aria-hidden>
                      {b.icon}
                    </span>
                    {t("breaks." + b.id + ".title")}
                  </div>
                  <Switch
                    checked={enabledBreaks.includes(b.id)}
                    onCheckedChange={() => toggleBreakType(b.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          {notificationsSupported && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t("settings.notifications")}
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-2xl border-2 border-border bg-white">
                <div className="font-bold flex items-center gap-3 text-foreground">
                  <span className="text-2xl" role="img" aria-hidden>
                    🔔
                  </span>
                  {t("settings.notifications")}
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full mt-4 gap-2"
          onClick={handleStart}
        >
          <Play className="w-5 h-5 fill-current" />
          {t("setup.start")}
        </Button>
      </motion.div>

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
    </motion.div>
  );
}