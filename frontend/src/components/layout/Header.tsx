"use client";

import { ShieldCheck, HardDrive, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#293449] bg-[#0B1120]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#F1F5F9]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* System Indicators */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151E30] border border-[#293449] text-xs font-mono text-[#38BDF8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>AEAD Mode Active</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151E30] border border-[#293449] text-xs font-mono text-[#94A3B8]">
            <HardDrive className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>SQLite WAL</span>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
