import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Check } from "lucide-react";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!res.ok) throw new Error("error");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setText("");
        setOpen(false);
      }, 2000);
    } catch {
      setError("No pudimos enviar tu mensaje. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    // invisible: hidden from view but stays in the DOM
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 invisible">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-72 bg-white rounded-2xl border-2 border-border shadow-lg p-4 flex flex-col gap-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-black text-foreground text-sm">Feedback</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 py-3 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-foreground">¡Gracias por tu aporte!</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Nos encantaría que nos cuentes qué te pareció nuestra app! Podés dejarnos
                  comentarios, ideas para próximos lanzamientos o lo que quieras! Gracias por
                  tu aporte :)
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribí tu comentario..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border-2 border-border bg-background text-foreground text-xs font-medium resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {error && (
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {sending ? (
                    <span className="animate-pulse">Enviando…</span>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Enviar</>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => { setOpen((v) => !v); setSent(false); setError(""); }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-md text-xs font-black hover:opacity-90 transition-opacity"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Feedback
      </motion.button>
    </div>
  );
}
