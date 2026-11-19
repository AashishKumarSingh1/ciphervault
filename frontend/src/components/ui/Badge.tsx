import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "amber" | "blue" | "green" | "red" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  const variantStyles = {
    amber: "bg-amber-500/10 text-[#F59E0B] border-amber-500/30",
    blue: "bg-sky-500/10 text-[#38BDF8] border-sky-500/30",
    green: "bg-emerald-500/10 text-[#22C55E] border-emerald-500/30",
    red: "bg-rose-500/10 text-[#EF4444] border-rose-500/30",
    neutral: "bg-[#1B263B] text-[#94A3B8] border-[#293449]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
