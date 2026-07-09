import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_0_hsl(24,95%,45%)] hover:shadow-[0_2px_0_hsl(24,95%,45%)] hover:translate-y-[2px] active:shadow-[0_0px_0_hsl(24,95%,45%)] active:translate-y-[4px]",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_4px_0_hsl(160,50%,35%)] hover:shadow-[0_2px_0_hsl(160,50%,35%)] hover:translate-y-[2px] active:shadow-[0_0px_0_hsl(160,50%,35%)] active:translate-y-[4px]",
      accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_4px_0_hsl(195,80%,50%)] hover:shadow-[0_2px_0_hsl(195,80%,50%)] hover:translate-y-[2px] active:shadow-[0_0px_0_hsl(195,80%,50%)] active:translate-y-[4px]",
      outline: "border-2 border-border bg-transparent hover:bg-black/5 text-foreground shadow-sm active:translate-y-[1px]",
      ghost: "bg-transparent hover:bg-black/5 text-foreground active:translate-y-[1px]",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-xl",
      md: "h-12 px-6 text-base font-semibold rounded-2xl",
      lg: "h-14 px-8 text-lg font-bold rounded-2xl",
      icon: "h-12 w-12 rounded-2xl flex items-center justify-center",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";