import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, CircleCheck, Loader2 } from "lucide-react";
import { useRequestMagicLink } from "@workspace/api-client-react";
import { Button } from "./Button";

export function RecoverAccess() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const requestMagicLink = useRequestMagicLink();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setSent(false);
    setError(false);
    requestMagicLink.mutate(
      { data: { email: value } },
      {
        onSuccess: () => setSent(true),
        onError: () => setError(true),
      }
    );
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border-2 border-border shadow-sm z-10"
      >
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 bg-secondary/20 text-secondary rounded-full flex items-center justify-center">
              <CircleCheck className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-black text-foreground">{t("recovery.title")}</h2>
            <p className="text-muted-foreground font-medium">{t("recovery.success")}</p>
          </motion.div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">{t("recovery.title")}</h2>
              <p className="text-muted-foreground font-medium">{t("recovery.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                  setError(false);
                }}
                placeholder={t("recovery.placeholder")}
                className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-center text-lg"
                autoFocus
              />
              {error && <p className="text-destructive text-sm font-bold text-center">{t("recovery.error")}</p>}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!email.trim() || requestMagicLink.isPending}
                className="w-full"
              >
                {requestMagicLink.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t("recovery.sending")}</>
                ) : (
                  t("recovery.button")
                )}
              </Button>
            </form>
          </>
        )}
      </motion.div>

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}