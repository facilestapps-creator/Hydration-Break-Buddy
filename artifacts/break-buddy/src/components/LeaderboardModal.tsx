import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";
import { useGetTeamLeaderboard, getGetTeamLeaderboardQueryKey, useGetTeam, getGetTeamQueryKey } from "@workspace/api-client-react";
import { Trophy, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function LeaderboardModal({ isOpen, teamId, onClose }: { isOpen: boolean, teamId: number | null, onClose: () => void }) {
  const { t } = useTranslation();

  const { data: leaderboard, isLoading } = useGetTeamLeaderboard(teamId!, {
    query: {
      enabled: !!teamId && isOpen,
      queryKey: teamId ? getGetTeamLeaderboardQueryKey(teamId) : ["leaderboard", null],
      refetchInterval: 30000,
    }
  });

  const { data: team } = useGetTeam(teamId!, {
    query: {
      enabled: !!teamId && isOpen,
      queryKey: teamId ? getGetTeamQueryKey(teamId) : ["team", null],
    }
  });

  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showClose={true}>
      <div className="p-6 md:p-8 flex flex-col max-h-[85vh]">
        <div className="text-center mb-6">
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
      </div>
    </Modal>
  );
}
