import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className = "", elevated = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[#293449] p-6 transition-all ${
        elevated ? "bg-[#1B263B]" : "bg-[#151E30]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 flex items-center justify-between ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-[#F1F5F9] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-[#94A3B8] font-mono mt-0.5 ${className}`}>{children}</p>;
}
