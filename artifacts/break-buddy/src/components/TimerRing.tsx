import { motion } from "framer-motion";

interface TimerRingProps {
  progress: number; // 0 to 1
  timeLeft: string;
  label: string;
}

export function TimerRing({ progress, timeLeft, label }: TimerRingProps) {
  const size = 280;
  const strokeWidth = 24;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="relative flex items-center justify-center drop-shadow-sm" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1, ease: "linear" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-6xl font-black text-foreground tracking-tighter tabular-nums drop-shadow-sm">
          {timeLeft}
        </div>
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2">
          {label}
        </div>
      </div>
    </div>
  );
}