import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import { Users, User as UserIcon } from "lucide-react";

export function ModeSelection({ onSelect }: { onSelect: (mode: "solo" | "team") => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 lg:p-8 bg-background relative overflow-hidden"
    >
      <div className="animate-float mb-8 z-10">
        <Mascot state="celebrate" />
      </div>
      <h1 className="text-4xl font-black mb-3 text-foreground text-center z-10">Welcome to Break Buddy!</h1>
      <p className="text-muted-foreground text-lg mb-12 text-center max-w-md z-10 font-medium">
        Your cheerful desk companion. How would you like to play?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl z-10">
        <motion.button 
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("solo")}
          className="w-full h-full bg-white p-8 rounded-[2rem] border-2 border-border shadow-sm flex flex-col items-center text-center gap-4 hover:border-accent hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <UserIcon className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground mb-2">Play Solo</h2>
            <p className="text-muted-foreground font-medium">Track your own breaks, just for you.</p>
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("team")}
          className="w-full h-full bg-white p-8 rounded-[2rem] border-2 border-border shadow-sm flex flex-col items-center text-center gap-4 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Users className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground mb-2">Join a Team</h2>
            <p className="text-muted-foreground font-medium">Compete with your office crew for weekly medals.</p>
          </div>
        </motion.button>
      </div>

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
    </motion.div>
  );
}
