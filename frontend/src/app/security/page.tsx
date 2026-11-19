"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  FileText,
  Info,
  Layers,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api, SecuritySuiteResponse, SecurityTestCaseResult } from "@/lib/api";

export default function SecurityCenterPage() {
  const [suite, setSuite] = useState<SecuritySuiteResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    // Load overview and initial test run
    api.getSecurityOverview().then(setOverview).catch(console.error);
    handleRunTests();
  }, []);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const data = await api.runSecurityTests();
      setSuite(data);
    } catch (err: any) {
      alert(`Security suite execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <MainLayout
      title="Security Center & Cryptographic Verification"
      subtitle="Automated Integrity Verification, Adversary Emulation & Defenses Against Tampering"
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={handleRunTests}
          isLoading={isRunning}
        >
          <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
          <span>Execute Security Tests</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Status Banner */}
        {suite && (
          <div
            className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              suite.all_passed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {suite.all_passed ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-[#22C55E]">
                  <ShieldCheck className="w-7 h-7" />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-red-500/20 text-[#EF4444]">
                  <ShieldAlert className="w-7 h-7" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold font-mono tracking-tight text-[#F1F5F9]">
                  {suite.all_passed
                    ? "ALL 6 SECURITY TEST CASES PASSED"
                    : "SECURITY VULNERABILITY DETECTED"}
                </h3>
                <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                  Verified at: {suite.timestamp} • Execution Suite: 6 automated test scenarios
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <span className="text-2xl font-bold text-[#22C55E]">
                  {suite.passed_tests}
                </span>
                <span className="text-sm text-[#94A3B8]"> / {suite.total_tests} Passed</span>
              </div>
              <Badge variant={suite.all_passed ? "green" : "red"}>
                {suite.all_passed ? "OPTIMAL POSTURE" : "ATTENTION NEEDED"}
              </Badge>
            </div>
          </div>
        )}

        {/* Security Test Cases List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#38BDF8]" />
              Controlled Security Verification Suite
            </h3>
            <span className="text-xs font-mono text-[#94A3B8]">
              Automated Adversarial Simulation
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {suite?.results.map((test) => (
              <Card key={test.id} className="p-5 space-y-4 border-[#293449]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#293449] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#1B263B] text-xs font-mono text-[#38BDF8] border border-[#293449]">
                      {test.id}
                    </span>
                    <h4 className="text-sm font-semibold text-[#F1F5F9]">
                      {test.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#94A3B8]">
                      {test.execution_time_ms} ms
                    </span>
                    <Badge variant={test.status === "PASSED" ? "green" : "red"}>
                      {test.status === "PASSED" ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                          PASSED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-[#EF4444]" />
                          FAILED
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {test.description}
                </p>

                {/* Expected vs Actual Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
                    <span className="text-[#38BDF8] text-[11px] uppercase tracking-wider block font-semibold">
                      Expected Security Outcome:
                    </span>
                    <p className="text-[#94A3B8]">{test.expected_result}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] space-y-1">
                    <span className="text-[#22C55E] text-[11px] uppercase tracking-wider block font-semibold">
                      Actual Observed Behavior:
                    </span>
                    <p className="text-[#F1F5F9]">{test.actual_result}</p>
                  </div>
                </div>

                {/* Mitigation Mechanism Tag */}
                <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#F59E0B]">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Defense Mechanism: {test.mitigation_mechanism}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Scope & Limitations Notice */}
        <Card className="border-amber-500/20 bg-[#151E30]/70">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-semibold text-[#F1F5F9]">Scope & Limitations Notice</h4>
              <p className="text-[#94A3B8] leading-relaxed">
                {suite?.scope_notice ||
                  "CipherVault implements AES-256-GCM authenticated encryption at rest, protecting stored records from unauthorized reading, offline ciphertext modification, and key confusion. It does not protect against physical host memory extraction, compromised operating system kernels, or side-channel timing attacks on untrusted hardware."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
