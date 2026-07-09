import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Play, Check, Trophy } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAudio } from "@/hooks/use-audio";
import { TimerRing } from "@/components/TimerRing";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Switch } from "@/components/Switch";
import { BREAK_TYPES, BreakType, YOUTUBE_LINKS } from "@/lib/breaks";
import { cn } from "@/lib/utils";

import { useQueryClient } from "@tanstack/react-query";
import { useGetUser, useLogBreak, getGetTeamLeaderboardQueryKey } from "@workspace/api-client-react";
import { ModeSelection } from "@/components/ModeSelection";
import { TeamOnboarding } from "@/components/TeamOnboarding";
import { LeaderboardModal } from "@/components/LeaderboardModal";

export default function Home() {
  const [mode, setMode] = useLocalStorage<"solo" | "team" | null>("bb-mode", null);
  const [userId, setUserId] = useLocalStorage<number | null>("bb-userId", null);
  const [teamId, setTeamId] = useLocalStorage<number | null>("bb-teamId", null);

  // Settings
  const [workInterval, setWorkInterval] = useLocalStorage("bb-interval", 25);
  const [enabledBreaks, setEnabledBreaks] = useLocalStorage<BreakType[]>("bb-breaks", ["hydration", "walk", "eye"]);
  const [notifications, setNotifications] = useLocalStorage("bb-notifications", false);
  
  // Stats
  const [breaksTaken, setBreaksTaken] = useLocalStorage("bb-stats-today", 0);
  const [lastBreakDate, setLastBreakDate] = useLocalStorage("bb-last-date", new Date().toDateString());
  
  // Session State
  const [timeLeft, setTimeLeft] = useState(workInterval * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [currentBreakIndex, setCurrentBreakIndex] = useState(0);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [youtubeIndex, setYoutubeIndex] = useState(0);
  
  const { playNotificationSound } = useAudio();
  const queryClient = useQueryClient();
  const logBreak = useLogBreak();
  
  const { data: user } = useGetUser(userId!, { 
    query: { enabled: !!userId && mode === "team", queryKey: ["user", userId] } 
  });
  
  // Reset stats on new day
  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== lastBreakDate) {
      setBreaksTaken(0);
      setLastBreakDate(today);
    }
  }, [lastBreakDate, setBreaksTaken, setLastBreakDate]);

  // Handle Work Interval changes
  useEffect(() => {
    if (!isRunning && !isBreakModalOpen) {
      setTimeLeft(workInterval * 60);
    }
  }, [workInterval, isRunning, isBreakModalOpen]);

  // Notifications logic
  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
  useEffect(() => {
    if (!notificationsSupported) return;
    if (notifications && Notification.permission !== "granted") {
      Notification.requestPermission().then(perm => {
        if (perm !== "granted") {
          setNotifications(false);
        }
      });
    }
  }, [notifications, notificationsSupported, setNotifications]);

  // Timer Effect
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          triggerBreak();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, enabledBreaks, currentBreakIndex]);

  const activeBreakType = enabledBreaks.length > 0 
    ? enabledBreaks[currentBreakIndex % enabledBreaks.length]
    : "walk";
    
  const breakInfo = BREAK_TYPES[activeBreakType as BreakType] || BREAK_TYPES.walk;

  const triggerBreak = () => {
    setIsRunning(false);
    playNotificationSound();
    
    if (notifications && Notification.permission === "granted") {
      new Notification("Time for a break!", {
        body: breakInfo.title,
      });
    }
    
    setIsBreakModalOpen(true);
  };

  const skipBreak = () => {
    nextBreak();
  };
  
  const takeBreakNow = () => {
    triggerBreak();
  };

  const finishBreak = () => {
    setBreaksTaken(prev => prev + 1);
    setIsBreakModalOpen(false);
    
    if (activeBreakType === "eye") {
      setYoutubeIndex(prev => (prev + 1) % YOUTUBE_LINKS.length);
    }
    
    // Server-side tracking for Team mode
    if (mode === "team" && userId) {
       logBreak.mutate({ data: { userId, breakType: activeBreakType } }, {
         onSuccess: () => {
           if (teamId) {
             queryClient.invalidateQueries({ queryKey: getGetTeamLeaderboardQueryKey(teamId) });
           }
         }
       });
    }

    nextBreak();
  };

  const nextBreak = () => {
    setCurrentBreakIndex(prev => prev + 1);
    setTimeLeft(workInterval * 60);
    setIsRunning(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleBreakType = (type: BreakType) => {
    setEnabledBreaks(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // Don't allow 0 breaks
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  // View routing
  if (!mode) {
    return <ModeSelection onSelect={setMode} />;
  }

  if (mode === "team" && (!userId || !teamId)) {
    return (
      <TeamOnboarding 
        initialUserId={userId} 
        onComplete={(u, t) => { setUserId(u); setTeamId(t); setMode("team"); }} 
        onBack={() => setMode(null)} 
      />
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 lg:p-8 bg-background relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start md:items-center z-10 pointer-events-none">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 pointer-events-auto">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border-2 border-border font-bold text-foreground flex items-center gap-2">
            <span role="img" aria-label="star" className="text-xl">⭐</span> Today: {breaksTaken} breaks
          </div>
          {mode === "team" && (
            <button 
              onClick={() => setIsLeaderboardOpen(true)}
              className="bg-white p-2 rounded-2xl shadow-sm border-2 border-yellow-200 text-yellow-500 hover:border-yellow-400 hover:bg-yellow-50 transition-all cursor-pointer group"
              title="Team Leaderboard"
            >
              <Trophy className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 pointer-events-auto mt-2 md:mt-0">
          {mode === "team" && user && (
            <div className="hidden sm:flex bg-primary/10 px-4 py-2 rounded-2xl font-bold text-primary border-2 border-primary/20 items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {user.name}
            </div>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            data-testid="button-settings"
          >
            <Settings className="w-6 h-6 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center gap-10 z-10 w-full max-w-md mt-16">
        
        <div className="animate-float">
          <Mascot state={isBreakModalOpen ? "celebrate" : !isRunning ? "break" : "idle"} />
        </div>

        <div className="flex flex-col items-center gap-8 w-full">
          <TimerRing 
            progress={timeLeft / (workInterval * 60)} 
            timeLeft={formatTime(timeLeft)}
            label="Until Next Break"
          />
          
          <div className="bg-white/70 backdrop-blur-sm px-6 py-4 rounded-[2rem] border-2 border-border text-center flex flex-col items-center gap-1 shadow-sm w-full max-w-[280px]">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Up Next</span>
            <div className="font-bold text-lg flex items-center gap-2 text-foreground">
              <span className="text-2xl" role="img" aria-hidden>{breakInfo.icon}</span> {breakInfo.title}
            </div>
          </div>
        </div>

        <div className="flex gap-4 w-full justify-center max-w-[280px]">
          {isRunning ? (
            <>
              <Button variant="ghost" onClick={skipBreak} className="w-1/3">
                Skip
              </Button>
              <Button variant="secondary" onClick={takeBreakNow} className="w-2/3 gap-2">
                <Play className="w-5 h-5 fill-current" />
                Take Now
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsRunning(true)} className="w-full gap-2">
              <Play className="w-5 h-5 fill-current" />
              Resume Timer
            </Button>
          )}
        </div>
      </div>

      {/* Switch Mode Button */}
      <div className="absolute bottom-6 flex w-full justify-center z-10">
        <button 
          onClick={() => setMode(mode === "solo" ? "team" : "solo")}
          className="text-muted-foreground text-sm font-bold hover:text-foreground transition-colors cursor-pointer bg-white/60 hover:bg-white backdrop-blur-sm px-5 py-2.5 rounded-full border-2 border-border hover:border-muted-foreground/30 shadow-sm"
        >
          Switch to {mode === "solo" ? "Team Mode" : "Solo Mode"}
        </button>
      </div>

      {/* Leaderboard Modal */}
      {mode === "team" && (
        <LeaderboardModal 
          isOpen={isLeaderboardOpen} 
          teamId={teamId} 
          onClose={() => setIsLeaderboardOpen(false)} 
        />
      )}

      {/* Break Modal */}
      <Modal isOpen={isBreakModalOpen} onClose={() => {}} showClose={false}>
        <div className="p-8 text-center flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
            className={cn("w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-5xl mb-6 shadow-lg border-4 border-white", breakInfo.color)}
          >
            <span role="img" aria-hidden>{breakInfo.icon}</span>
          </motion.div>
          
          <h2 className="text-3xl font-black mb-3 text-foreground">{breakInfo.title}</h2>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed font-medium">
            {breakInfo.description}
          </p>

          {activeBreakType === "eye" && (
            <Button 
              variant="accent" 
              className="w-full mb-4"
              onClick={() => window.open(YOUTUBE_LINKS[youtubeIndex], "_blank")}
            >
              Watch Exercise Video
            </Button>
          )}

          <Button variant="primary" size="lg" className="w-full gap-2 text-lg" onClick={finishBreak}>
            <Check className="w-6 h-6 stroke-[3]" />
            Done!
          </Button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6" /> Settings
          </h2>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Work Interval</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 45, 60].map(min => (
                  <button
                    key={min}
                    onClick={() => setWorkInterval(min)}
                    className={cn(
                      "py-3 rounded-2xl font-bold transition-all border-2 cursor-pointer",
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

            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Enabled Breaks</label>
              <div className="space-y-2">
                {Object.values(BREAK_TYPES).map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-white">
                    <div className="flex items-center gap-3 font-bold text-foreground">
                      <span className="text-2xl" role="img" aria-hidden>{b.icon}</span>
                      {b.title}
                    </div>
                    <Switch 
                      checked={enabledBreaks.includes(b.id)} 
                      onCheckedChange={() => toggleBreakType(b.id)} 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Preferences</label>
              <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-white">
                <div className="font-bold flex items-center gap-3 text-foreground">
                  <span className="text-2xl" role="img" aria-hidden>🔔</span> Browser Notifications
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications} 
                />
              </div>
            </div>
            
            <Button variant="primary" className="w-full mt-4" onClick={() => setIsSettingsOpen(false)}>
              Save & Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
