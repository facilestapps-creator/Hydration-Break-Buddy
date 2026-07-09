import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { ArrowLeft, Users, Plus, Copy, Check, Loader2 } from "lucide-react";
import { useCreateUser, useCreateTeam, useJoinTeam } from "@workspace/api-client-react";

export function TeamOnboarding({ 
  initialUserId, 
  onComplete,
  onBack
}: { 
  initialUserId: number | null, 
  onComplete: (userId: number, teamId: number) => void,
  onBack: () => void
}) {
  const [step, setStep] = useState<"name" | "team-choice" | "create-team" | "join-team" | "invite-code">(
    initialUserId ? "team-choice" : "name"
  );
  const [userId, setUserId] = useState<number | null>(initialUserId);
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedTeam, setGeneratedTeam] = useState<{id: number, inviteCode: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const createUser = useCreateUser();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    createUser.mutate({ data: { name: name.trim() } }, {
      onSuccess: (user) => {
        setUserId(user.id);
        setStep("team-choice");
        window.localStorage.setItem("bb-userId", String(user.id));
      },
      onError: () => setError("Oops, couldn't save your name. Try again.")
    });
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !userId) return;
    setError("");
    createTeam.mutate({ data: { name: teamName.trim(), userId } }, {
      onSuccess: (team) => {
        setGeneratedTeam({ id: team.id, inviteCode: team.inviteCode });
        setStep("invite-code");
      },
      onError: () => setError("Could not create team. Try again.")
    });
  };

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !userId) return;
    setError("");
    joinTeam.mutate({ data: { inviteCode: inviteCode.trim().toUpperCase(), userId } }, {
      onSuccess: (team) => {
        onComplete(userId, team.id);
      },
      onError: () => setError("Invalid invite code. Make sure it's correct!")
    });
  };

  const copyCode = () => {
    if (generatedTeam) {
      navigator.clipboard.writeText(generatedTeam.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border-2 border-border shadow-sm z-10"
      >
        {step === "name" && (
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground font-bold text-sm mb-6 hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to mode selection
          </button>
        )}
        {["create-team", "join-team"].includes(step) && (
          <button onClick={() => { setStep("team-choice"); setError(""); }} className="flex items-center gap-2 text-muted-foreground font-bold text-sm mb-6 hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === "name" && (
            <motion.form key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleNameSubmit} className="flex flex-col gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">Team Mode</h2>
                <p className="text-muted-foreground font-medium">What should we call you on the leaderboard?</p>
              </div>
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Your friendly name..." 
                  maxLength={50}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-center text-lg"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
              </div>
              <Button type="submit" variant="primary" size="lg" disabled={!name.trim() || createUser.isPending} className="w-full">
                {createUser.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
              </Button>
            </motion.form>
          )}

          {step === "team-choice" && (
            <motion.div key="team-choice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6 text-center">
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2">Team Setup</h2>
                <p className="text-muted-foreground font-medium">Join your office crew or start a new team.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setStep("create-team")} className="flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 border-border hover:border-primary bg-background hover:bg-primary/5 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span className="font-bold text-foreground">Create Team</span>
                </button>
                <button onClick={() => setStep("join-team")} className="flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 border-border hover:border-secondary bg-background hover:bg-secondary/5 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                    <Users className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span className="font-bold text-foreground">Join Team</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === "create-team" && (
            <motion.form key="create-team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleCreateTeam} className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-2xl font-black text-foreground mb-2">Name Your Team</h2>
                <p className="text-muted-foreground font-medium">Give your crew a fun name.</p>
              </div>
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)} 
                  placeholder="e.g. Design Dream Team" 
                  maxLength={50}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-center text-lg"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
              </div>
              <Button type="submit" variant="primary" size="lg" disabled={!teamName.trim() || createTeam.isPending} className="w-full">
                {createTeam.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Team"}
              </Button>
            </motion.form>
          )}

          {step === "join-team" && (
            <motion.form key="join-team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleJoinTeam} className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-2xl font-black text-foreground mb-2">Enter Invite Code</h2>
                <p className="text-muted-foreground font-medium">Ask your team creator for the code.</p>
              </div>
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. ABC123XYZ" 
                  className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-background text-foreground font-black focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/20 transition-all text-center text-2xl tracking-widest uppercase"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
              </div>
              <Button type="submit" variant="secondary" size="lg" disabled={!inviteCode.trim() || joinTeam.isPending} className="w-full">
                {joinTeam.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Team"}
              </Button>
            </motion.form>
          )}

          {step === "invite-code" && generatedTeam && (
            <motion.div key="invite-code" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6 text-center">
              <div>
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                  <Check className="w-10 h-10 text-primary-foreground stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2">Team Created!</h2>
                <p className="text-muted-foreground font-medium">Share this code with your coworkers so they can join.</p>
              </div>
              
              <div className="bg-background p-6 rounded-3xl border-2 border-dashed border-primary/30 flex flex-col items-center gap-4">
                <span className="text-4xl font-black tracking-widest text-foreground">{generatedTeam.inviteCode}</span>
                <Button variant="outline" onClick={copyCode} className="gap-2">
                  {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Code"}
                </Button>
              </div>

              <Button onClick={() => onComplete(userId!, generatedTeam.id)} variant="primary" size="lg" className="w-full mt-2">
                Enter Team Mode
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
