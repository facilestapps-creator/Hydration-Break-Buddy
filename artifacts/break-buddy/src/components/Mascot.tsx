import { motion } from "framer-motion";

export function Mascot({ state = "idle" }: { state?: "idle" | "break" | "celebrate" }) {
  // A cute blob/face mascot
  return (
    <div className="relative w-24 h-24 mx-auto">
      <motion.div
        className="absolute inset-0 bg-primary rounded-[40%] flex items-center justify-center"
        animate={{
          borderRadius: ["40%", "45%", "35%", "40%"],
          rotate: state === "celebrate" ? [0, -10, 10, 0] : 0,
          scale: state === "celebrate" ? [1, 1.1, 1] : 1,
        }}
        transition={{
          borderRadius: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 0.5, ease: "easeInOut" },
          scale: { duration: 0.5, ease: "easeInOut" }
        }}
      >
        <div className="flex gap-3 pb-2 relative z-10">
          {/* Eyes */}
          <motion.div
            className="w-3 h-4 bg-primary-foreground rounded-full"
            animate={state === "break" ? { scaleY: 0.2 } : { scaleY: [1, 1, 0.1, 1, 1] }}
            transition={state === "break" ? {} : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1, 1] }}
          />
          <motion.div
            className="w-3 h-4 bg-primary-foreground rounded-full"
            animate={state === "break" ? { scaleY: 0.2 } : { scaleY: [1, 1, 0.1, 1, 1] }}
            transition={state === "break" ? {} : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1, 1] }}
          />
        </div>
        {/* Mouth */}
        <motion.div
          className="absolute bottom-10 w-4 h-3 bg-primary-foreground rounded-b-full rounded-t-sm z-10"
          animate={{
            height: state === "celebrate" ? 12 : state === "break" ? 4 : 8,
            width: state === "break" ? 12 : 16,
            borderRadius: state === "break" ? "50%" : "2px 2px 16px 16px"
          }}
        />
        {/* Cheeks */}
        <div className="absolute top-[4.5rem] left-[2.2rem] w-3 h-2 bg-red-500/30 rounded-full blur-[1px]" />
        <div className="absolute top-[4.5rem] right-[2.2rem] w-3 h-2 bg-red-500/30 rounded-full blur-[1px]" />
      </motion.div>
    </div>
  );
}