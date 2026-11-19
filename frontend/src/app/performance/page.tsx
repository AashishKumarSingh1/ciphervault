"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Play,
  Download,
  Clock,
  HardDrive,
  Cpu,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api, BenchmarkResult } from "@/lib/api";

const BATCH_SIZES = [100, 500, 1000, 5000];

export default function PerformancePage() {
  const [selectedBatch, setSelectedBatch] = useState<number>(100);
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<BenchmarkResult | null>(null);
  const [history, setHistory] = useState<BenchmarkResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.getBenchmarkHistory(10);
      setHistory(res.results);
      if (res.results.length > 0 && !currentResult) {
        setCurrentResult(res.results[0]);
      }
    } catch (err) {
      console.error("Failed to load benchmark history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    try {
      const result = await api.runBenchmark(selectedBatch);
      setCurrentResult(result);
      await fetchHistory();
    } catch (err: any) {
      alert(`Benchmark execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), "_blank");
  };

  // Prepare chart data for history comparison
  const latencyChartData = history
    .slice()
    .reverse()
    .map((item, idx) => ({
      name: `#${idx + 1} (${item.record_count} rec)`,
      "Enc Latency (µs)": item.avg_encryption_latency_us,
      "Dec Latency (µs)": item.avg_decryption_latency_us,
    }));

  const storageChartData = history
    .slice()
    .reverse()
    .map((item, idx) => ({
      name: `#${idx + 1} (${item.record_count})`,
      "Plaintext (KB)": Math.round(item.plaintext_size_bytes / 1024),
      "Encrypted (KB)": Math.round(item.encrypted_size_bytes / 1024),
    }));

  return (
    <MainLayout
      title="Performance & Storage Benchmark Suite"
      subtitle="High-Resolution Monotonic Timings, Latency Profiling & Storage Overhead Calculation"
      actions={
        <Button variant="secondary" size="sm" onClick={handleExportCsv}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          <span>Export CSV</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Top Control Bar & Run Trigger */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-[#151E30] to-[#1B263B]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
                AES-256-GCM Benchmark Configuration
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Select synthetic batch volume to execute cryptographic operations and measure storage overhead.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0B1120] border border-[#293449]">
                {BATCH_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedBatch(size)}
                    disabled={isRunning}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                      selectedBatch === size
                        ? "bg-[#F59E0B] text-slate-950 font-bold shadow-sm"
                        : "text-[#94A3B8] hover:text-[#F1F5F9]"
                    }`}
                  >
                    {size.toLocaleString()} Recs
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                onClick={handleRunBenchmark}
                isLoading={isRunning}
              >
                <Play className="w-4 h-4 mr-1.5 fill-current" />
                <span>Execute Benchmark</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Real Measured Metrics Grid */}
        {currentResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {/* Encryption Latency */}
            <Card>
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span>AVG ENC LATENCY</span>
                <Clock className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-[#F1F5F9]">
                  {currentResult.avg_encryption_latency_us} µs
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-1">
                  Total Enc Time: {currentResult.encryption_time_ms} ms
                </div>
              </div>
            </Card>

            {/* Decryption Latency */}
            <Card>
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span>AVG DEC LATENCY</span>
                <Cpu className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-[#F1F5F9]">
                  {currentResult.avg_decryption_latency_us} µs
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-1">
                  Total Dec Time: {currentResult.decryption_time_ms} ms
                </div>
              </div>
            </Card>

            {/* Storage Overhead */}
            <Card>
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span>STORAGE OVERHEAD</span>
                <HardDrive className="w-4 h-4 text-[#22C55E]" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-[#22C55E]">
                  +{currentResult.storage_overhead_pct}%
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-1">
                  Tag (16B) + Nonce (12B) per record
                </div>
              </div>
            </Card>

            {/* Operations Throughput */}
            <Card>
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span>THROUGHPUT</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-[#F1F5F9]">
                  {currentResult.throughput_records_per_sec.toLocaleString()}
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-1">
                  Crypto Ops / Second
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Visual Charts: Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Latency Benchmark */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Encryption vs Decryption Latency</CardTitle>
                <CardDescription>
                  Average per-record execution latency in microseconds (µs)
                </CardDescription>
              </div>
            </CardHeader>
            <div className="h-64 w-full">
              {latencyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#293449" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} unit=" µs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#151E30",
                        borderColor: "#293449",
                        borderRadius: "8px",
                        color: "#F1F5F9",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Enc Latency (µs)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dec Latency (µs)" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#94A3B8] font-mono">
                  Execute a benchmark to generate latency chart.
                </div>
              )}
            </div>
          </Card>

          {/* Chart 2: Storage Overhead Comparison */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Plaintext vs Encrypted Storage Footprint</CardTitle>
                <CardDescription>
                  Comparative storage footprint showing 28-byte GCM metadata delta
                </CardDescription>
              </div>
            </CardHeader>
            <div className="h-64 w-full">
              {storageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={storageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#293449" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} unit=" KB" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#151E30",
                        borderColor: "#293449",
                        borderRadius: "8px",
                        color: "#F1F5F9",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Plaintext (KB)"
                      stroke="#94A3B8"
                      fill="#94A3B8"
                      fillOpacity={0.15}
                    />
                    <Area
                      type="monotone"
                      dataKey="Encrypted (KB)"
                      stroke="#22C55E"
                      fill="#22C55E"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#94A3B8] font-mono">
                  Execute a benchmark to generate storage comparison chart.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Historical Results Table */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <div>
              <CardTitle>Historical Execution Logs</CardTitle>
              <CardDescription>
                Audited benchmarks stored in SQLite with monotonic timing
              </CardDescription>
            </div>
            <Badge variant="blue">{history.length} Runs Recorded</Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#293449] bg-[#1B263B]/60 text-[#94A3B8]">
                  <th className="p-4 font-medium">Execution ID</th>
                  <th className="p-4 font-medium">Batch Size</th>
                  <th className="p-4 font-medium">Enc Time (ms)</th>
                  <th className="p-4 font-medium">Dec Time (ms)</th>
                  <th className="p-4 font-medium">Avg Enc (µs)</th>
                  <th className="p-4 font-medium">Avg Dec (µs)</th>
                  <th className="p-4 font-medium">Overhead (%)</th>
                  <th className="p-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#293449]/60">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#94A3B8]">
                      Loading benchmark history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#94A3B8]">
                      No previous benchmark runs found.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="hover:bg-[#1B263B]/40 transition-colors">
                      <td className="p-4 text-[#38BDF8]">
                        {row.id.slice(0, 8)}...
                      </td>
                      <td className="p-4 text-[#F1F5F9] font-medium">
                        {row.record_count.toLocaleString()}
                      </td>
                      <td className="p-4 text-[#F59E0B]">{row.encryption_time_ms}</td>
                      <td className="p-4 text-[#38BDF8]">{row.decryption_time_ms}</td>
                      <td className="p-4 text-[#94A3B8]">
                        {row.avg_encryption_latency_us}
                      </td>
                      <td className="p-4 text-[#94A3B8]">
                        {row.avg_decryption_latency_us}
                      </td>
                      <td className="p-4 text-[#22C55E]">+{row.storage_overhead_pct}%</td>
                      <td className="p-4 text-[#94A3B8]">{row.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
