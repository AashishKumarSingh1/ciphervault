"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Database,
  Cpu,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  Lock,
  PlaySquare,
} from "lucide-react";
import { api } from "@/lib/api";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Secure Records", href: "/records", icon: Database },
  { name: "Encryption Lab", href: "/encryption-lab", icon: Cpu },
  { name: "AES Simulator", href: "/simulator", icon: PlaySquare },
  { name: "Performance Lab", href: "/performance", icon: BarChart3 },
  { name: "Security Center", href: "/security", icon: ShieldAlert },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-[#0B1120] border-r border-[#293449] flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#293449] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
            <Shield className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-[#F1F5F9] flex items-center gap-1.5">
              CipherVault
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-[#38BDF8] uppercase bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
              AES-256-GCM
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
          Core Architecture
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-amber-500/15 text-[#F59E0B] border border-amber-500/30 shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151E30]"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-[#F59E0B]" : "text-[#94A3B8]"
                }`}
              />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status & Session */}
      <div className="p-4 border-t border-[#293449] space-y-3 bg-[#151E30]/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0B1120] border border-[#293449] text-xs font-mono text-[#94A3B8]">
          <Lock className="w-3.5 h-3.5 text-[#22C55E]" />
          <span className="truncate">Active User: admin</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
