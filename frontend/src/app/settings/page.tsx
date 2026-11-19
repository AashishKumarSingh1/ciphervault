"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Lock,
  Key,
  HardDrive,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api, User as UserType } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    api.getMe().then(setUser).catch(console.error);
  }, []);

  return (
    <MainLayout
      title="System Settings & Security Architecture"
      subtitle="Cryptographic Policies, Session Configuration & Zero-Knowledge Key Management"
    >
      <div className="space-y-6 max-w-4xl">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#F59E0B]" />
                Authenticated Administrator Profile
              </CardTitle>
              <CardDescription>
                Active local session identity & authorization role
              </CardDescription>
            </div>
            <Badge variant="amber">{user?.role || "admin"}</Badge>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449]">
              <span className="text-[#94A3B8] block text-[11px]">Username</span>
              <span className="text-[#F1F5F9] font-medium text-sm mt-0.5 block">
                {user?.username || "admin"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449]">
              <span className="text-[#94A3B8] block text-[11px]">System Role</span>
              <span className="text-[#38BDF8] font-medium text-sm mt-0.5 block uppercase">
                {user?.role || "Administrator"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449]">
              <span className="text-[#94A3B8] block text-[11px]">Principal ID</span>
              <span className="text-[#F1F5F9] text-xs mt-0.5 block truncate">
                {user?.id || "local-admin-root"}
              </span>
            </div>
          </div>
        </Card>

        {/* Cryptographic Architecture Policies */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#38BDF8]" />
                Cryptographic Key Architecture
              </CardTitle>
              <CardDescription>
                Zero-knowledge key separation and symmetric cipher specifications
              </CardDescription>
            </div>
            <Badge variant="blue">AES-256-GCM</Badge>
          </CardHeader>

          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
                <span className="text-[#38BDF8] font-semibold">Master Key Separation</span>
                <p className="text-[#94A3B8] leading-relaxed">
                  Master 256-bit key is injected solely through server environment variables.
                  Keys are never stored inside SQLite database tables or transmitted to frontend browsers.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
                <span className="text-[#22C55E] font-semibold">Fresh Nonce Guarantee</span>
                <p className="text-[#94A3B8] leading-relaxed">
                  Each encryption operation samples 12 fresh cryptographically secure bytes from OS entropy
                  pool (`Crypto.Random.get_random_bytes(12)`). Zero nonce reuse under any circumstances.
                </p>
              </div>
            </div>

            {/* Critical Lost Key Warning Banner */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs font-sans">
                <h4 className="font-semibold text-[#F1F5F9]">
                  Cryptographic Immutability Notice: No Insecure Master Key Reset
                </h4>
                <p className="text-[#94A3B8] leading-relaxed">
                  CipherVault deliberately omits any backdoor &quot;password reset&quot; or master key bypass.
                  If the 256-bit master encryption key is lost, encrypted database records are mathematically
                  irrecoverable without a verified physical key backup.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Database & Storage Engine Specs */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#22C55E]" />
                Persistence & Storage Subsystem
              </CardTitle>
              <CardDescription>
                SQLite storage engine details and integrity controls
              </CardDescription>
            </div>
            <Badge variant="green">WAL Mode Active</Badge>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
              <span className="text-[#94A3B8]">Database Engine</span>
              <div className="text-[#F1F5F9] font-medium">SQLite 3 (WAL)</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
              <span className="text-[#94A3B8]">Integrity Mode</span>
              <div className="text-[#F1F5F9] font-medium">Pre-Insert AEAD</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
              <span className="text-[#94A3B8]">Application Release</span>
              <div className="text-[#F1F5F9] font-medium">CipherVault v1.0.0</div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
