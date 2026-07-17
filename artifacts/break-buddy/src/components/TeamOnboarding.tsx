import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { ArrowLeft, Users, Plus, Copy, Check, Loader2, CreditCard, RefreshCw, XCircle, Building2 } from "lucide-react";
import {
  useCreateUser,
  useCreateTeam,
  useJoinTeam,
  useCreatePayment,
  useGetPaymentStatus,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type Step =
  | "name"
  | "team-choice"
  | "plan-choice"
  | "payment"
  | "pay-pending"
  | "create-team"
  | "join-team"
  | "invite-code";

export function TeamOnboarding({
  initialUserId,
  onComplete,
  onBack,
}: {
  initialUserId: number | null;
  onComplete: (userId: number, teamId: number) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  const searchParams = new URLSearchParams(window.location.search);
  const bbPaymentResult = searchParams.get("bb_payment");
  const bbPaymentToken = searchParams.get("token");
  // MP redirects back with ?preapproval_id=... (our back_url params are stripped)
  const mpReturnPreapprovalId = searchParams.get("preapproval_id");

  const getInitialStep = (): Step => {
    if ((bbPaymentResult === "success" || bbPaymentResult === "pending") && bbPaymentToken) return "pay-pending";
    if (bbPaymentResult === "failure") return "payment";
    // Returning from MP checkout: preapproval_id in URL + pending token in storage
    if (mpReturnPreapprovalId && window.localStorage.getItem("bb-pending-payment")) return "pay-pending";
    if (initialUserId) return "team-choice";
    return "name";
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [userId, setUserId] = useState<number | null>(initialUserId);
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedTeam, setGeneratedTeam] = useState<{ id: number; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Persist selected plan across MP redirect (3DS case)
  const [selectedPlan, setSelectedPlan] = useState<"team" | "company">(
    () => (window.localStorage.getItem("bb-pending-plan") as "team" | "company" | null) ?? "team"
  );

  const [pendingToken, setPendingToken] = useState<string | null>(
    bbPaymentToken ?? window.localStorage.getItem("bb-pending-payment")
  );
  const [paymentFailedMsg, setPaymentFailedMsg] = useState(
    bbPaymentResult === "failure" ? t("onboarding.payPending.failed") : ""
  );

  const createUser = useCreateUser();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const createPayment = useCreatePayment();

  const pollingEnabled = step === "pay-pending" && !!pendingToken;
  const paymentStatus = useGetPaymentStatus(pendingToken ?? "", {
    query: {
      enabled: pollingEnabled,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "approved" || status === "rejected" || status === "cancelled") return false;
        return 2000;
      },
      staleTime: 0,
    },
  });

  const cleanedUrlRef = useRef(false);
  useEffect(() => {
    if (!cleanedUrlRef.current && (bbPaymentResult || bbPaymentToken || mpReturnPreapprovalId)) {
      cleanedUrlRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("bb_payment");
      url.searchParams.delete("token");
      url.searchParams.delete("preapproval_id");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (step === "pay-pending") {
      const status = paymentStatus.data?.status;
      if (status === "approved") {
        window.localStorage.removeItem("bb-pending-payment");
        setStep("create-team");
      } else if (status === "rejected" || status === "cancelled") {
        window.localStorage.removeItem("bb-pending-payment");
        window.localStorage.removeItem("bb-pending-plan");
        setPendingToken(null);
        setPaymentFailedMsg(t("onboarding.payPending.failed"));
        setStep("payment");
      }
    }
  }, [paymentStatus.data?.status, step, t]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    createUser.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: (user) => {
          setUserId(user.id);
          setStep("team-choice");
          window.localStorage.setItem("bb-userId", String(user.id));
        },
        onError: () => setError(t("onboarding.name.error")),
      }
    );
  };

  const handleSelectPlan = (plan: "team" | "company") => {
    setSelectedPlan(plan);
    setStep("payment");
  };

  // Redirect the user to MP's hosted subscription checkout page.
  const handleInitiatePayment = () => {
    setError("");
    createPayment.mutate(
      { data: { plan: selectedPlan } },
      {
        onSuccess: (result) => {
          window.localStorage.setItem("bb-pending-payment", result.paymentToken);
          window.localStorage.setItem("bb-pending-plan", selectedPlan);
          setPendingToken(result.paymentToken);
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          } else {
            // Fallback: no checkout URL (shouldn't happen), go to polling step
            setStep("pay-pending");
          }
        },
        onError: (err) => {
          const detail = (err as { data?: { detail?: string } })?.data?.detail;
          setError(detail ?? t("onboarding.payment.error"));
        },
      }
    );
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !userId || !pendingToken) return;
    setError("");
    createTeam.mutate(
      { data: { name: teamName.trim(), paymentToken: pendingToken! } },
      {
        onSuccess: (team) => {
          setPendingToken(null);
          window.localStorage.removeItem("bb-pending-payment");
          window.localStorage.removeItem("bb-pending-plan");
          setGeneratedTeam({ id: team.id, inviteCode: team.inviteCode });
          setStep("invite-code");
        },
        onError: () => setError(t("onboarding.createTeam.error")),
      }
    );
  };

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !userId) return;
    setError("");
    joinTeam.mutate(
      { data: { inviteCode: inviteCode.trim().toUpperCase() } },
      {
        onSuccess: (team) => {
          onComplete(userId, team.id);
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? t("onboarding.joinTeam.error");
          setError(msg);
        },
      }
    );
  };

  const copyCode = () => {
    if (generatedTeam) {
      navigator.clipboard.writeText(generatedTeam.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const payStatus = paymentStatus.data?.status;
  const isApproved = payStatus === "approved";
  const isFailed = payStatus === "rejected" || payStatus === "cancelled";

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border-2 border-border shadow-sm z-10"
      >
        {/* ── Back buttons ─────────────────────────────────────────────────── */}
        {(step === "name" || step === "team-choice") && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground font-bold text-sm mb-6 hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onboarding.backToMode")}
          </button>
        )}
        {step === "plan-choice" && (
          <button
            onClick={() => { setStep("team-choice"); setError(""); }}
            className="flex items-center gap-2 text-muted-foreground font-bold text-sm mb-6 hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onboarding.back")}
          </button>
        )}
        {(step === "payment" || step === "join-team" || step === "create-team") && (
          <button
            onClick={() => {
              if (step === "payment") setStep("plan-choice");
              else setStep("team-choice");
              setError("");
              setPaymentFailedMsg("");
            }}
            className="flex items-center gap-2 text-muted-foreground font-bold text-sm mb-6 hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onboarding.back")}
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* ── NAME ── */}
          {step === "name" && (
            <motion.form
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleNameSubmit}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.name.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.name.subtitle")}</p>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("onboarding.name.placeholder")}
                  maxLength={50}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-center text-lg"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!name.trim() || createUser.isPending}
                className="w-full"
              >
                {createUser.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t("onboarding.name.continue")}
              </Button>
            </motion.form>
          )}

          {/* ── TEAM CHOICE ── */}
          {step === "team-choice" && (
            <motion.div
              key="team-choice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6 text-center"
            >
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.teamChoice.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.teamChoice.subtitle")}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setStep("plan-choice")}
                  className="flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 border-border hover:border-primary bg-background hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span className="font-bold text-foreground">{t("onboarding.teamChoice.create")}</span>
                </button>
                <button
                  onClick={() => setStep("join-team")}
                  className="flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 border-border hover:border-secondary bg-background hover:bg-secondary/5 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                    <Users className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span className="font-bold text-foreground">{t("onboarding.teamChoice.join")}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── PLAN CHOICE ── */}
          {step === "plan-choice" && (
            <motion.div
              key="plan-choice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center">
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.planChoice.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.planChoice.subtitle")}</p>
              </div>
              <div className="flex flex-col gap-3">
                {/* Team plan */}
                <button
                  onClick={() => handleSelectPlan("team")}
                  className="flex items-center gap-4 p-5 rounded-3xl border-2 border-border hover:border-primary bg-background hover:bg-primary/5 transition-all text-left cursor-pointer group"
                >
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-foreground text-lg">{t("onboarding.planChoice.team.name")}</div>
                    <div className="text-sm text-muted-foreground font-medium">{t("onboarding.planChoice.team.members")}</div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-primary rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Company plan */}
                <button
                  onClick={() => handleSelectPlan("company")}
                  className="flex items-center gap-4 p-5 rounded-3xl border-2 border-border hover:border-secondary bg-background hover:bg-secondary/5 transition-all text-left cursor-pointer group"
                >
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center group-hover:bg-secondary/25 transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-foreground text-lg">{t("onboarding.planChoice.company.name")}</span>
                      <span className="text-xs font-black px-2 py-0.5 bg-secondary/15 text-secondary rounded-full uppercase tracking-wide">PRO</span>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">{t("onboarding.planChoice.company.members")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t("onboarding.planChoice.company.logo")}</div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-secondary rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── PAYMENT ── */}
          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                  selectedPlan === "company" ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"
                )}>
                  <CreditCard className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.payment.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.payment.subtitle")}</p>
              </div>

              {/* Selected plan badge */}
              <div className={cn(
                "flex items-center gap-3 px-5 py-4 rounded-2xl border-2",
                selectedPlan === "company"
                  ? "border-secondary/30 bg-secondary/5"
                  : "border-primary/30 bg-primary/5"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selectedPlan === "company" ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"
                )}>
                  {selectedPlan === "company" ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-black text-foreground">
                    {selectedPlan === "company"
                      ? t("onboarding.planChoice.company.name")
                      : t("onboarding.planChoice.team.name")}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {selectedPlan === "company"
                      ? t("onboarding.planChoice.company.members")
                      : t("onboarding.planChoice.team.members")}
                  </div>
                </div>
              </div>

              {paymentFailedMsg && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl px-4 py-3 text-sm font-bold">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {paymentFailedMsg}
                </div>
              )}

              {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleInitiatePayment}
                disabled={createPayment.isPending}
              >
                {createPayment.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("onboarding.payment.loading")}</>
                ) : (
                  t("onboarding.payment.button")
                )}
              </Button>

              {import.meta.env.DEV && (
                <button
                  type="button"
                  className="w-full text-xs text-amber-600 border border-dashed border-amber-400 rounded-xl py-2 px-4 bg-amber-50 hover:bg-amber-100 transition-colors font-mono"
                  onClick={() => {
                    setError("");
                    createPayment.mutate(
                      { data: { plan: selectedPlan } },
                      {
                        onSuccess: async (result) => {
                          window.localStorage.setItem("bb-pending-payment", result.paymentToken);
                          window.localStorage.setItem("bb-pending-plan", selectedPlan);
                          setPendingToken(result.paymentToken);
                          // Approve the payment immediately via the dev endpoint
                          await fetch("/api/dev/approve-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ token: result.paymentToken }),
                          });
                          setStep("pay-pending");
                        },
                        onError: () => setError("Dev simulate failed"),
                      }
                    );
                  }}
                  disabled={createPayment.isPending}
                >
                  ⚡ DEV: Simulate payment approved
                </button>
              )}

              <p className="text-xs text-muted-foreground text-center font-medium">
                {t("onboarding.payment.secureNote")}
              </p>
            </motion.div>
          )}

          {/* ── PAY PENDING (polling) ── */}
          {step === "pay-pending" && (
            <motion.div
              key="pay-pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-6 text-center"
            >
              <div>
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  {isApproved ? (
                    <Check className="w-8 h-8 text-secondary stroke-[3]" />
                  ) : isFailed ? (
                    <XCircle className="w-8 h-8 text-destructive" />
                  ) : (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  )}
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.payPending.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.payPending.subtitle")}</p>
              </div>

              <div className="bg-muted/30 rounded-2xl px-5 py-4 font-bold text-sm text-foreground">
                {isApproved
                  ? t("onboarding.payPending.approved")
                  : isFailed
                  ? t("onboarding.payPending.failed")
                  : t("onboarding.payPending.checking")}
              </div>

              {isFailed && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setPendingToken(null);
                    setPaymentFailedMsg(t("onboarding.payPending.failed"));
                    setStep("payment");
                  }}
                >
                  {t("onboarding.payPending.retry")}
                </Button>
              )}
            </motion.div>
          )}

          {/* ── CREATE TEAM (name form, after subscription activated) ── */}
          {step === "create-team" && (
            <motion.form
              key="create-team"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleCreateTeam}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/20 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.createTeam.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.createTeam.subtitle")}</p>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={t("onboarding.createTeam.placeholder")}
                  maxLength={50}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-center text-lg"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!teamName.trim() || createTeam.isPending}
                className="w-full"
              >
                {createTeam.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t("onboarding.createTeam.button")}
              </Button>
            </motion.form>
          )}

          {/* ── JOIN TEAM ── */}
          {step === "join-team" && (
            <motion.form
              key="join-team"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleJoinTeam}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.joinTeam.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.joinTeam.subtitle")}</p>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-black focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all text-center text-2xl tracking-widest uppercase"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                disabled={!inviteCode.trim() || joinTeam.isPending}
                className="w-full"
              >
                {joinTeam.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t("onboarding.joinTeam.button")}
              </Button>
            </motion.form>
          )}

          {/* ── INVITE CODE (success) ── */}
          {step === "invite-code" && generatedTeam && (
            <motion.div
              key="invite-code"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6 text-center"
            >
              <div>
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                  <Check className="w-10 h-10 text-primary-foreground stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">{t("onboarding.inviteCode.title")}</h2>
                <p className="text-muted-foreground font-medium">{t("onboarding.inviteCode.subtitle")}</p>
              </div>

              <div className="bg-background p-6 rounded-3xl border-2 border-dashed border-primary/30 flex flex-col items-center gap-4">
                <span className="text-4xl font-black tracking-widest text-foreground">{generatedTeam.inviteCode}</span>
                <Button variant="outline" onClick={copyCode} className="gap-2">
                  {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                  {copied ? t("onboarding.inviteCode.copied") : t("onboarding.inviteCode.copy")}
                </Button>
              </div>

              <Button
                onClick={() => onComplete(userId!, generatedTeam.id)}
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                {t("onboarding.inviteCode.enter")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
