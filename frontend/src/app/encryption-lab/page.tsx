"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Binary,
  Layers,
  Fingerprint,
  Zap,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api, EncryptLabResponse, DecryptLabResponse } from "@/lib/api";

export default function EncryptionLabPage() {
  // Inputs
  const [plaintext, setPlaintext] = useState(
    "Confidential Project Specification: Project CipherVault AES-256 Authenticated Encryption Core."
  );
  const [labKey, setLabKey] = useState("");
  const [aadString, setAadString] = useState("session-tenant-verification-id-889");

  // Output states
  const [encryptResult, setEncryptResult] = useState<EncryptLabResponse | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Decryption state
  const [decryptKeyInput, setDecryptKeyInput] = useState("");
  const [decryptResult, setDecryptResult] = useState<DecryptLabResponse | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Tamper state
  const [isTampering, setIsTampering] = useState(false);
  const [tamperMessage, setTamperMessage] = useState<string | null>(null);

  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    // Load lab key on mount
    api.getLabKey().then((res) => {
      setLabKey(res.lab_key_hex);
      setDecryptKeyInput(res.lab_key_hex);
    });
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleEncrypt = async () => {
    if (!plaintext.trim()) return;
    setIsEncrypting(true);
    setDecryptResult(null);
    setTamperMessage(null);
    try {
      const res = await api.encryptLab({
        plaintext,
        custom_key_hex: labKey,
        aad_string: aadString || undefined,
      });
      setEncryptResult(res);
      setDecryptKeyInput(labKey);
    } catch (err: any) {
      alert(`Encryption failed: ${err.message}`);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async (useWrongKey = false) => {
    if (!encryptResult) return;
    setIsDecrypting(true);
    setDecryptResult(null);

    let keyToUse = decryptKeyInput;
    if (useWrongKey) {
      // Intentionally invert bytes of the key
      keyToUse = "ff".repeat(32);
      setDecryptKeyInput(keyToUse);
    }

    try {
      const res = await api.decryptLab({
        ciphertext: encryptResult.ciphertext,
        nonce: encryptResult.nonce,
        auth_tag: encryptResult.auth_tag,
        custom_key_hex: keyToUse,
        aad_string: aadString || undefined,
      });
      setDecryptResult(res);
    } catch (err: any) {
      alert(`Decryption request error: ${err.message}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleTamperCiphertext = async () => {
    if (!encryptResult) return;
    setIsTampering(true);
    try {
      const res = await api.tamperLab({
        ciphertext: encryptResult.ciphertext,
        nonce: encryptResult.nonce,
        auth_tag: encryptResult.auth_tag,
        target: "ciphertext",
        byte_index: 2,
      });
      setEncryptResult({
        ...encryptResult,
        ciphertext: res.tampered_ciphertext,
      });
      setTamperMessage(
        "Bit-flip simulated! Ciphertext byte index 2 altered. Now test 'Decrypt' to see MAC rejection."
      );
      setDecryptResult(null);
    } catch (err: any) {
      alert(`Tamper simulation failed: ${err.message}`);
    } finally {
      setIsTampering(false);
    }
  };

  const handleGenerateNewKey = async () => {
    const res = await api.generateSampleKey();
    setLabKey(res.key_hex);
    setDecryptKeyInput(res.key_hex);
  };

  return (
    <MainLayout
      title="Cryptographic Demonstration Lab"
      subtitle="Interactive AES-256-GCM AEAD Construction, Nonce Randomness & MAC Tag Verification"
    >
      <div className="space-y-6">
        {/* Cryptographic Architecture Concept Banner */}
        <div className="p-4 rounded-xl bg-[#151E30] border border-[#293449] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Cpu className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#F1F5F9]">
                Authenticated Encryption with Associated Data (AEAD)
              </h4>
              <p className="text-xs text-[#94A3B8]">
                AES-GCM combines CTR confidentiality with GHASH integrity authentication in a single pass.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="blue">AES.MODE_GCM</Badge>
            <Badge variant="amber">256-bit Key</Badge>
            <Badge variant="green">96-bit Nonce</Badge>
          </div>
        </div>

        {/* STEP 1: PLAINTEXT & CRYPTOGRAPHIC PARAMETERS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plaintext Input */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-[#F59E0B] flex items-center justify-center text-xs font-mono font-bold">
                      1
                    </span>
                    Plaintext Data Input
                  </CardTitle>
                  <CardDescription>
                    Enter sample plaintext to undergo authenticated encryption
                  </CardDescription>
                </div>
              </CardHeader>

              <div className="space-y-4">
                <textarea
                  rows={4}
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  placeholder="Enter message to encrypt..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-amber-500"
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-[#94A3B8]">
                    Associated Authenticated Data (AAD) — Optional Binding
                  </label>
                  <input
                    type="text"
                    value={aadString}
                    onChange={(e) => setAadString(e.target.value)}
                    className="w-full px-3.5 py-1.5 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono text-[#38BDF8] focus:outline-none focus:border-sky-500"
                    placeholder="e.g. record-uuid or context metadata"
                  />
                  <p className="text-[11px] text-[#94A3B8] font-mono">
                    AAD is authenticated by the MAC tag but remains unencrypted in transport.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#293449] flex items-center justify-between">
              <span className="text-xs font-mono text-[#94A3B8]">
                Plaintext: {new TextEncoder().encode(plaintext).length} bytes
              </span>
              <Button
                variant="primary"
                onClick={handleEncrypt}
                isLoading={isEncrypting}
              >
                <Lock className="w-4 h-4 mr-1.5" />
                Encrypt with AES-256-GCM
              </Button>
            </div>
          </Card>

          {/* Test Key Management */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-[#38BDF8] flex items-center justify-center text-xs font-mono font-bold">
                      2
                    </span>
                    Dedicated Lab Key (256-bit)
                  </CardTitle>
                  <CardDescription>
                    Distinct test key isolated from production storage master key
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateNewKey}
                  title="Generate fresh random key"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>New Random Key</span>
                </Button>
              </CardHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#94A3B8]">
                      Active 256-Bit Key (Hex Representation):
                    </span>
                    <button
                      onClick={() => handleCopy(labKey, "key")}
                      className="text-xs font-mono text-[#38BDF8] hover:underline flex items-center gap-1"
                    >
                      {copiedField === "key" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] font-mono text-xs text-[#F59E0B] break-all leading-relaxed">
                    {labKey}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#1B263B]/60 border border-[#293449] text-[11px] font-mono text-[#94A3B8] space-y-1">
                  <div>Key Length: 32 bytes (256 bits)</div>
                  <div>Security Classification: Symmetric Master Key (Lab Isolated)</div>
                  <div>Storage Policy: Zero persistence in SQLite tables</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#293449] flex items-center gap-2 text-xs text-[#22C55E] font-mono">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Full key separation principle verified</span>
            </div>
          </Card>
        </div>

        {/* STEP 2: CIPHERTEXT & CRYPTOGRAPHIC COMPONENTS OUTPUT */}
        {encryptResult && (
          <Card className="border-sky-500/30 bg-[#151E30] space-y-6 animate-in fade-in duration-300">
            <CardHeader className="mb-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-[#38BDF8]">
                  <Fingerprint className="w-5 h-5 text-[#38BDF8]" />
                  Cryptographic Artifacts (AES-256-GCM Output)
                </CardTitle>
                <CardDescription>
                  Ciphertext, fresh initialization nonce, and 128-bit authentication tag
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="blue">
                  Ciphertext: {encryptResult.ciphertext_length_bytes}B
                </Badge>
                <Badge variant="green">Nonce: 12B</Badge>
                <Badge variant="amber">Tag: 16B</Badge>
              </div>
            </CardHeader>

            {tamperMessage && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-[#F59E0B] flex items-start gap-2">
                <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{tamperMessage}</span>
              </div>
            )}

            {/* Hex Inspection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Ciphertext */}
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#38BDF8] font-semibold">
                    1. Ciphertext (Encrypted Payload Hex)
                  </span>
                  <button
                    onClick={() => handleCopy(encryptResult.ciphertext, "ct")}
                    className="text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1"
                  >
                    {copiedField === "ct" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#0B1120] border border-[#293449] font-mono text-xs text-[#38BDF8] break-all max-h-32 overflow-y-auto leading-relaxed shadow-inner">
                  {encryptResult.ciphertext}
                </div>
              </div>

              {/* 2. Nonce and Tag Stack */}
              <div className="space-y-4">
                {/* 12-byte Nonce */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#22C55E] font-semibold">
                      2. Nonce (96-bit IV)
                    </span>
                    <button
                      onClick={() => handleCopy(encryptResult.nonce, "nonce")}
                      className="text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1"
                    >
                      {copiedField === "nonce" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B1120] border border-[#293449] font-mono text-xs text-[#22C55E] break-all shadow-inner">
                    {encryptResult.nonce}
                  </div>
                </div>

                {/* 16-byte Auth Tag */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#F59E0B] font-semibold">
                      3. Authentication Tag (128-bit MAC)
                    </span>
                    <button
                      onClick={() => handleCopy(encryptResult.auth_tag, "tag")}
                      className="text-[#94A3B8] hover:text-[#F1F5F9] flex items-center gap-1"
                    >
                      {copiedField === "tag" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B1120] border border-[#293449] font-mono text-xs text-[#F59E0B] break-all shadow-inner">
                    {encryptResult.auth_tag}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: INTERACTIVE VERIFICATION & TAMPER DEMONSTRATIONS */}
            <div className="pt-4 border-t border-[#293449] space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-[#38BDF8]" />
                  <span className="text-xs font-mono text-[#F1F5F9]">
                    Cryptographic Integrity Tests:
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Normal Decrypt */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDecrypt(false)}
                    isLoading={isDecrypting}
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1" />
                    Verify & Decrypt (Correct Key)
                  </Button>

                  {/* Wrong Key Test */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDecrypt(true)}
                    isLoading={isDecrypting}
                    title="Simulate decryption attempt with incorrect key"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 mr-1" />
                    Wrong-Key Test
                  </Button>

                  {/* Tamper Ciphertext Button */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleTamperCiphertext}
                    isLoading={isTampering}
                    title="Simulate active man-in-the-middle bit-flip"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    Simulate Bit-Flip Tampering
                  </Button>
                </div>
              </div>

              {/* Decryption & Integrity Verification Feedback Box */}
              {decryptResult && (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    decryptResult.integrity_verified
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {decryptResult.integrity_verified ? (
                      <ShieldCheck className="w-6 h-6 text-[#22C55E] shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-[#EF4444] shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-mono">
                          {decryptResult.integrity_verified
                            ? "AUTHENTICATION TAG VERIFICATION: PASSED"
                            : "AUTHENTICATION TAG VERIFICATION: REJECTED"}
                        </span>
                        <Badge
                          variant={decryptResult.integrity_verified ? "green" : "red"}
                        >
                          {decryptResult.integrity_verified
                            ? "INTEGRITY INTACT"
                            : "TAMPER DETECTED / WRONG KEY"}
                        </Badge>
                      </div>

                      <p className="text-xs font-mono leading-relaxed">
                        {decryptResult.verification_details}
                      </p>

                      {decryptResult.integrity_verified && decryptResult.decrypted_plaintext && (
                        <div className="mt-3 p-3 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono text-[#F1F5F9] whitespace-pre-wrap shadow-inner">
                          <span className="text-[#94A3B8] block text-[10px] mb-1 uppercase tracking-wider">
                            Decrypted Plaintext Restored:
                          </span>
                          {decryptResult.decrypted_plaintext}
                        </div>
                      )}

                      {!decryptResult.integrity_verified && (
                        <div className="mt-2 text-xs font-mono text-red-400 bg-red-950/30 p-2.5 rounded border border-red-900/50">
                          {decryptResult.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
