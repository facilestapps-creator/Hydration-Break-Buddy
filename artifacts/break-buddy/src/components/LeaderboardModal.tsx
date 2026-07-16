import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";
import { useGetTeamLeaderboard, getGetTeamLeaderboardQueryKey, useGetTeam, getGetTeamQueryKey, usePatchTeamLogo } from "@workspace/api-client-react";
import { Trophy, Copy, Check, AlertCircle, Loader2, Image, AlertTriangle, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export function LeaderboardModal({ isOpen, teamId, onClose }: { isOpen: boolean, teamId: number | null, onClose: () => void }) {
  const { t } = useTranslation();

  const { data: leaderboard, isLoading } = useGetTeamLeaderboard(teamId!, {
    query: {
      enabled: !!teamId && isOpen,
      queryKey: teamId ? getGetTeamLeaderboardQueryKey(teamId) : ["leaderboard", null],
      refetchInterval: 30000,
    }
  });

  const { data: team, refetch: refetchTeam } = useGetTeam(teamId!, {
    query: {
      enabled: !!teamId && isOpen,
      queryKey: teamId ? getGetTeamQueryKey(teamId) : ["team", null],
    }
  });

  const [copied, setCopied] = useState(false);
  const [logoInput, setLogoInput] = useState("");
  const [logoSaved, setLogoSaved] = useState(false);
  const [logoError, setLogoError] = useState("");

  const patchLogo = usePatchTeamLogo();

  const copyCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveLogo = () => {
    if (!teamId || !logoInput.trim()) return;
    setLogoError("");
    setLogoSaved(false);
    patchLogo.mutate(
      { teamId, data: { logoUrl: logoInput.trim() } },
      {
        onSuccess: () => {
          setLogoSaved(true);
          setLogoInput("");
          refetchTeam();
          setTimeout(() => setLogoSaved(false), 3000);
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error
            ?? t("leaderboard.logo.error");
          setLogoError(msg);
        },
      }
    );
  };

  const subscriptionBad = team && (team.subscriptionStatus === "paused" || team.subscriptionStatus === "cancelled");
  const logoUrl = leaderboard?.logoUrl ?? team?.logoUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showClose={true}>
      <div className="p-6 md:p-8 flex flex-col max-h-[85vh]">
        <div className="text-center mb-6">
          {/* Team logo */}
          {logoUrl && (
            <div className="flex justify-center mb-3">
              <img
                src={logoUrl}
                alt={t("leaderboard.title")}
                className="h-14 max-w-[200px] object-contain rounded-xl border border-border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
            <Trophy className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
            {leaderboard?.teamName || team?.name || t("leaderboard.title")}
          </h2>

          {team && (
            <div className="inline-flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border mt-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("leaderboard.inviteCode")}</span>
              <span className="font-black text-foreground tracking-widest">{team.inviteCode}</span>
              <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Subscription status banner (paused / cancelled) */}
        {subscriptionBad && (
          <div className={cn(
            "flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 text-sm font-bold border",
            team.subscriptionStatus === "cancelled"
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-orange-50 border-orange-200 text-orange-700"
          )}>
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              {team.subscriptionStatus === "paused"
                ? t("onboarding.subscriptionStatus.paused")
                : t("onboarding.subscriptionStatus.cancelled")}
            </div>
          </div>
        )}

        {/* Near member limit banner */}
        {team?.nearMemberLimit && (
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 text-sm font-bold border bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t("leaderboard.nearLimit")}</span>
          </div>
        )}

        <div className="flex justify-between items-center px-2 mb-4">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t("leaderboard.rankings")}</span>
          {leaderboard?.weekStart && (
            <span className="text-sm font-medium bg-secondary/10 text-secondary px-3 py-1 rounded-full border border-secondary/20">
              {t("leaderboard.weekOf", { date: new Date(leaderboard.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }) })}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-[2rem] border-2 border-border bg-background p-2 md:p-4 space-y-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-bold">{t("leaderboard.loading")}</p>
            </div>
          ) : leaderboard?.members.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="font-bold">{t("leaderboard.empty")}</p>
              <p className="text-sm">{t("leaderboard.emptyHint")}</p>
            </div>
          ) : (
            leaderboard?.members.map((member) => {
              const isFirst = member.rank === 1;
              const isTop3 = member.rank <= 3;

              return (
                <div
                  key={member.userId}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                    isFirst ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-sm" :
                      isTop3 ? "bg-white border-border" : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black text-lg",
                    isFirst ? "bg-yellow-400 text-yellow-900 shadow-inner" :
                      member.rank === 2 ? "bg-gray-300 text-gray-800" :
                        member.rank === 3 ? "bg-amber-600 text-amber-50" :
                          "bg-background text-muted-foreground border-2 border-border"
                  )}>
                    {member.rank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-black text-foreground truncate flex items-center gap-2 text-lg">
                      {member.name}
                      {member.medal && <span role="img" aria-label="medal" className="text-xl">{member.medal}</span>}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      <span><span className="font-bold text-foreground">{member.todayBreaks}</span> {t("leaderboard.today")}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className={cn("text-2xl font-black", isFirst ? "text-yellow-700" : "text-foreground")}>
                      {member.weeklyBreaks}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("leaderboard.weekly")}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Company plan logo URL input */}
        {team?.plan === "company" && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-muted-foreground">{t("leaderboard.logo.title")}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={logoInput}
                onChange={(e) => { setLogoInput(e.target.value); setLogoError(""); setLogoSaved(false); }}
                placeholder={t("leaderboard.logo.placeholder")}
                className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-border bg-background text-foreground text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!logoInput.trim() || patchLogo.isPending}
                onClick={handleSaveLogo}
                className="shrink-0"
              >
                {patchLogo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("leaderboard.logo.save")}
              </Button>
            </div>
            {logoError && (
              <p className="text-destructive text-xs font-bold mt-1.5">{logoError}</p>
            )}
            {logoSaved && (
              <p className="text-secondary text-xs font-bold mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {t("leaderboard.logo.success")}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
