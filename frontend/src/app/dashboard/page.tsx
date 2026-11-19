"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  Cpu,
  HardDrive,
  Activity,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api, DashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <MainLayout
      title="Security Operations Dashboard"
      subtitle="AES-256-GCM Authenticated Storage & Real-Time Integrity State"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          isLoading={refreshing}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Encrypted Records */}
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Encrypted Records
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Database className="w-4 h-4 text-[#F59E0B]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold tracking-tight text-[#F1F5F9]">
                {loading ? "..." : stats?.total_records}
              </div>
              <p className="text-xs text-[#38BDF8] font-mono mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                Zero plaintext at rest
              </p>
            </div>
          </Card>

          {/* Encryption Algorithm */}
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Cryptographic Mode
              </span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Cpu className="w-4 h-4 text-[#38BDF8]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
                AES-256-GCM
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-1">
                128-bit Poly1305 / GMAC Tag
              </p>
            </div>
          </Card>

          {/* Database Size on Disk */}
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Physical DB Size
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <HardDrive className="w-4 h-4 text-[#22C55E]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold tracking-tight text-[#F1F5F9]">
                {loading ? "..." : stats?.database_size_formatted}
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-1">
                SQLite WAL Engine
              </p>
            </div>
          </Card>

          {/* Tamper Detections */}
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Security Rejections
              </span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold tracking-tight text-[#F1F5F9]">
                {loading ? "..." : stats?.tampering_detected_count}
              </div>
              <p className="text-xs text-[#22C55E] font-mono mt-1">
                Integrity Violations Blocked
              </p>
            </div>
          </Card>
        </div>

        {/* Middle Section: Category Breakdown + Quick Lab Launcher */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Persisted Record Categories</CardTitle>
                <CardDescription>
                  Distribution of encrypted items by classification type
                </CardDescription>
              </div>
              <Link href="/records">
                <Button variant="ghost" size="sm">
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>

            <div className="space-y-4">
              {stats?.categories && stats.categories.length > 0 ? (
                stats.categories.map((cat) => {
                  const total = stats.total_records || 1;
                  const pct = Math.round((cat.count / total) * 100);
                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#F1F5F9] font-medium">{cat.category}</span>
                        <span className="text-[#94A3B8]">
                          {cat.count} records ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#0B1120] overflow-hidden border border-[#293449]">
                        <div
                          className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[#94A3B8] font-mono">
                  No records stored yet. Create your first record in Secure Records.
                </div>
              )}
            </div>
          </Card>

          {/* Quick Access Feature Gateway */}
          <Card className="flex flex-col justify-between border-amber-500/20 bg-gradient-to-b from-[#151E30] to-[#1B263B]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="font-semibold text-[#F1F5F9]">Interactive Lab</h3>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Demonstrate live AES-256-GCM authenticated encryption, nonce generation,
                simulated ciphertext bit-tampering, and wrong-key integrity verification.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1 text-xs font-mono">
                <div className="text-[#38BDF8]">Mode: AES.MODE_GCM</div>
                <div className="text-[#94A3B8]">Nonce Size: 96 bits (12 bytes)</div>
                <div className="text-[#94A3B8]">Tag Size: 128 bits (16 bytes)</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#293449]">
              <Link href="/encryption-lab">
                <Button variant="primary" className="w-full">
                  Launch Encryption Lab
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Recent Security & Database Activity Audit Feed */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Audit Trail</CardTitle>
              <CardDescription>
                Cryptographic operations and authorization events logged to SQLite
              </CardDescription>
            </div>
            <Badge variant="blue">Real-Time SQLite Logs</Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#293449] text-[#94A3B8]">
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Principal</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#293449]/50">
                {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                  stats.recent_activity.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1B263B]/40 transition-colors">
                      <td className="py-2.5 text-[#94A3B8] whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-2.5 text-[#F1F5F9] font-medium whitespace-nowrap">
                        {item.action}
                      </td>
                      <td className="py-2.5 text-[#38BDF8] whitespace-nowrap">
                        {item.username}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <Badge
                          variant={
                            item.status === "SUCCESS"
                              ? "green"
                              : item.status === "ALERT"
                              ? "amber"
                              : "red"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-[#94A3B8] max-w-md truncate">
                        {item.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      No audit events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
