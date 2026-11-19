"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    try {
      await api.login(username.trim(), password.trim());
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your login details.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setUsername("admin");
    setPassword("CipherVaultAdmin2026!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-2 shadow-inner">
            <Shield className="w-10 h-10 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">CipherVault</h1>
          <p className="text-sm text-[#94A3B8]">
            AES-256 Secure Database Management System
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-2xl border-[#293449]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <Lock className="w-4 h-4 mr-2" />
              Authenticate & Open Vault
            </Button>
          </form>
        </Card>

        {/* Demo Credentials Card */}
        <div className="p-4 rounded-xl bg-[#151E30]/60 border border-[#293449] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#38BDF8] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              DEFAULT DEMO CREDENTIALS
            </span>
            <button
              onClick={fillDemoCredentials}
              className="text-xs font-mono text-[#F59E0B] hover:text-[#D97706] hover:underline"
            >
              Fill Credentials
            </button>
          </div>
          <div className="text-xs font-mono text-[#94A3B8] space-y-1 bg-[#0B1120] p-2.5 rounded border border-[#293449]/70">
            <div>
              <span className="text-slate-400">Username: </span>
              <span className="text-[#F1F5F9]">admin</span>
            </div>
            <div>
              <span className="text-slate-400">Password: </span>
              <span className="text-[#F1F5F9]">CipherVaultAdmin2026!</span>
            </div>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Never persists plaintext passwords. Authenticates against salted Argon2/bcrypt hash stored in SQLite.
          </p>
        </div>
      </div>
    </div>
  );
}
