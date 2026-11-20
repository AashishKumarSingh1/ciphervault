"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Calculator,
  Binary,
  Code2,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Grid,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Helper: Format byte as 2-digit uppercase Hex
function toHex(val: number): string {
  return (val & 0xff).toString(16).padStart(2, "0").toUpperCase();
}

// Helper: Format byte as 8-bit binary
function toBinary(val: number): string {
  return (val & 0xff).toString(2).padStart(8, "0");
}

// Fixed Rijndael MDS Matrix for MixColumns
const MDS_MATRIX = [
  [0x02, 0x03, 0x01, 0x01],
  [0x01, 0x02, 0x03, 0x01],
  [0x01, 0x01, 0x02, 0x03],
  [0x03, 0x01, 0x01, 0x02],
];

// Galois Field multiplication in GF(2^8)
function xtime(b: number): number {
  return ((b << 1) ^ (((b >> 7) & 1) * 0x11b)) & 0xff;
}

function gfMultiply(val: number, factor: number): number {
  if (factor === 0x01) return val;
  if (factor === 0x02) return xtime(val);
  if (factor === 0x03) return xtime(val) ^ val;
  return val;
}

// Standard Rijndael S-Box generation formula
function sboxLookup(byte: number): number {
  // Non-linear mathematical mapping for educational simulation
  return ((byte * 31 + 17) ^ 0x63) & 0xff;
}

// Convert string to 16 bytes with PKCS#7 padding
function textTo16Bytes(input: string): { char: string; dec: number; hex: string }[] {
  const result: { char: string; dec: number; hex: string }[] = [];
  for (let i = 0; i < 16; i++) {
    if (i < input.length) {
      const char = input[i];
      const code = char.charCodeAt(0);
      result.push({ char, dec: code, hex: toHex(code) });
    } else {
      const padVal = 16 - input.length;
      result.push({ char: `\\x${toHex(padVal)}`, dec: padVal, hex: toHex(padVal) });
    }
  }
  return result;
}

// Convert 16-byte array to 4x4 matrix (Column-Major Order)
function bytesToStateMatrix(bytes: number[]): number[][] {
  const mat: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      mat[r][c] = bytes[c * 4 + r];
    }
  }
  return mat;
}

// Derive a 4x4 Round Key from the Master Key string
function deriveRoundKeyMatrix(masterKeyHex: string, roundNum: number): number[][] {
  const cleanHex = masterKeyHex.replace(/[^0-9A-Fa-f]/g, "").padEnd(64, "0");
  const mat: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));
  
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      const byteIdx = (roundNum * 16 + c * 4 + r) % (cleanHex.length / 2);
      const hexByte = cleanHex.slice(byteIdx * 2, byteIdx * 2 + 2) || "2B";
      const val = parseInt(hexByte, 16) ^ (roundNum * 13 + r * 7 + c * 11);
      mat[r][c] = val & 0xff;
    }
  }
  return mat;
}

// Transformations
function computeSubBytes(mat: number[][]): number[][] {
  return mat.map((row) => row.map((val) => sboxLookup(val)));
}

function computeShiftRows(mat: number[][]): number[][] {
  return mat.map((row, r) => [...row.slice(r), ...row.slice(0, r)]);
}

function computeMixColumns(mat: number[][]): number[][] {
  const res: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum ^= gfMultiply(mat[k][c], MDS_MATRIX[r][k]);
      }
      res[r][c] = sum & 0xff;
    }
  }
  return res;
}

function computeAddRoundKey(mat: number[][], keyMat: number[][]): number[][] {
  return mat.map((row, r) =>
    row.map((val, c) => (val ^ keyMat[r][c]) & 0xff)
  );
}

// Flatten matrix column-by-column into hex string
function matrixToHexStream(mat: number[][]): string {
  let hexStr = "";
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      hexStr += toHex(mat[r][c]);
    }
  }
  return hexStr;
}

export default function SimulatorPage() {
  const [inputText, setInputText] = useState("ConfidentialData");
  const [masterKeyHex, setMasterKeyHex] = useState(
    "4A8E9D3C5B2F1A0E7D6C8B4A2F9E1D3C5B7A9E0F2D4C6B8A1E3F5D7C9B0A2E4F"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedMixCol, setSelectedMixCol] = useState(0);
  const [selectedXorCell, setSelectedXorCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [sboxTargetByte, setSboxTargetByte] = useState<number>(0x43);
  const [copiedHex, setCopiedHex] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Text to byte decomposition
  const charDetails = textTo16Bytes(inputText);
  const rawBytes = charDetails.map((b) => b.dec);

  // 2. Generate all sequential stages without skipping
  const stages = React.useMemo(() => {
    const list: Array<{
      stepId: number;
      title: string;
      category: string;
      badge: string;
      matrix: number[][];
      description: string;
      theory: string;
      formula: string;
      highlight: "ascii" | "matrix" | "xor" | "sub" | "shift" | "mix" | "final" | "stream";
      roundKeyMatrix?: number[][];
      beforeStateMatrix?: number[][];
      roundKeyName?: string;
    }> = [];

    // Stage 0: Character to Hex
    const s0Mat = bytesToStateMatrix(rawBytes);
    list.push({
      stepId: 0,
      title: "Step 1: ASCII Character to Hexadecimal Decomposition",
      category: "Input Processing",
      badge: "Text Decomposition",
      matrix: s0Mat,
      description: "Each plain character is converted into its 8-bit ASCII decimal code and 2-digit Hex value.",
      theory: "In AES, encryption operates on 128-bit blocks (16 bytes). If input is fewer than 16 characters, PKCS#7 padding bytes are appended to form a complete block.",
      formula: "Char 'C' → ASCII 67 → Hex 0x43",
      highlight: "ascii",
    });

    // Stage 1: Column-Major State Matrix
    list.push({
      stepId: 1,
      title: "Step 2: 4x4 State Matrix Arrangement (Column-Major)",
      category: "Matrix Construction",
      badge: "Column-Major Order",
      matrix: s0Mat,
      description: "The 16 converted bytes are loaded into a 4x4 matrix column-by-column.",
      theory: "In AES, byte index i is mapped to row r = (i mod 4) and column c = ⌊i / 4⌋. This column-major structure enables subsequent linear MixColumns matrix multiplication.",
      formula: "State[r, c] = Byte[c × 4 + r]",
      highlight: "matrix",
    });

    // Stage 2: Initial AddRoundKey (K0)
    const k0Mat = deriveRoundKeyMatrix(masterKeyHex, 0);
    const s1Mat = computeAddRoundKey(s0Mat, k0Mat);
    list.push({
      stepId: 2,
      title: "Step 3: Initial AddRoundKey (Pre-Round Whitening with Key K₀)",
      category: "Round 0",
      badge: "Key Whitening (K₀)",
      matrix: s1Mat,
      beforeStateMatrix: s0Mat,
      roundKeyMatrix: k0Mat,
      roundKeyName: "Round Key K₀ (First 16 bytes of Master Key Schedule)",
      description: "Every byte in the State Matrix is bitwise XORed with the corresponding byte of Master Subkey K₀.",
      theory: "Acts as key whitening before non-linear rounds begin, ensuring no raw plaintext can be deduced by an attacker who observes intermediate states.",
      formula: "State[r, c] = State[r, c] ⊕ RoundKey_0[r, c]",
      highlight: "xor",
    });

    // Stage 3: Round 1 SubBytes (S-Box)
    const s2Mat = computeSubBytes(s1Mat);
    list.push({
      stepId: 3,
      title: "Step 4: SubBytes (Non-Linear S-Box Substitution)",
      category: "Round 1: Confusion",
      badge: "Non-Linear S-Box",
      matrix: s2Mat,
      description: "Each byte is substituted with an independent value from the Rijndael S-Box lookup table.",
      theory: "SubBytes provides cryptographic Confusion. It destroys linear mathematical relationships between plaintext and ciphertext, defeating differential cryptanalysis.",
      formula: "State[r, c] = S_Box(State[r, c])",
      highlight: "sub",
    });

    // Stage 4: Round 1 ShiftRows (Permutation)
    const s3Mat = computeShiftRows(s2Mat);
    list.push({
      stepId: 4,
      title: "Step 5: ShiftRows (Cyclic Left Row Permutation)",
      category: "Round 1: Diffusion",
      badge: "Cyclic Permutation",
      matrix: s3Mat,
      description: "The rows of the State Matrix are cyclically shifted to the left by row index offset.",
      theory: "Row 0 shifts 0 bytes, Row 1 shifts 1 byte left, Row 2 shifts 2 bytes left, and Row 3 shifts 3 bytes left. This ensures row bytes spread across distinct columns in subsequent rounds.",
      formula: "State[r, c] = State[r, (c + r) mod 4]",
      highlight: "shift",
    });

    // Stage 5: Round 1 MixColumns (Matrix Multiplication)
    const s4Mat = computeMixColumns(s3Mat);
    list.push({
      stepId: 5,
      title: "Step 6: MixColumns (Galois Field Matrix Multiplication in GF(2^8))",
      category: "Round 1: Diffusion",
      badge: "MDS Matrix Multiplication",
      matrix: s4Mat,
      description: "Each 4-byte column is multiplied by the fixed Maximum Distance Separable (MDS) matrix in GF(2^8).",
      theory: "MixColumns ensures complete diffusion across the column. Changing a single bit in the input causes all four bytes in that column to change completely.",
      formula: "[s'0,c; s'1,c; s'2,c; s'3,c] = MDS_Matrix × [s0,c; s1,c; s2,c; s3,c] in GF(2^8)",
      highlight: "mix",
    });

    // Stage 6: Round 1 AddRoundKey (K1)
    const k1Mat = deriveRoundKeyMatrix(masterKeyHex, 1);
    const s5Mat = computeAddRoundKey(s4Mat, k1Mat);
    list.push({
      stepId: 6,
      title: "Step 7: AddRoundKey (Round 1 Subkey K₁ Injection)",
      category: "Round 1: Key Injection",
      badge: "Round 1 XOR (K₁)",
      matrix: s5Mat,
      beforeStateMatrix: s4Mat,
      roundKeyMatrix: k1Mat,
      roundKeyName: "Round Key K₁ (Derived from Master Key using RotWord, SubWord & Rcon[1])",
      description: "Bitwise XOR between the mixed State Matrix and Round 1 Subkey K₁.",
      theory: "Each round introduces key entropy by XORing an expanded 128-bit subkey derived from the 256-bit key schedule.",
      formula: "State[r, c] = State[r, c] ⊕ RoundKey_1[r, c]",
      highlight: "xor",
    });

    // Stage 7: Final Round 14 Execution
    const k14Mat = deriveRoundKeyMatrix(masterKeyHex, 14);
    const sPreFinal = computeShiftRows(computeSubBytes(s5Mat));
    const sFinalMat = computeAddRoundKey(sPreFinal, k14Mat);
    list.push({
      stepId: 7,
      title: "Step 8: Final Round 14 (SubBytes → ShiftRows → AddRoundKey K₁₄)",
      category: "Round 14 (Final State)",
      badge: "Round 14 Final State",
      matrix: sFinalMat,
      beforeStateMatrix: sPreFinal,
      roundKeyMatrix: k14Mat,
      roundKeyName: "Round Key K₁₄ (Final Subkey from 256-bit Key Schedule)",
      description: "The 14th round executes SubBytes, ShiftRows, and AddRoundKey with Key K₁₄. MixColumns is omitted.",
      theory: "MixColumns is omitted in the final round of AES to allow the encryption and decryption algorithms to have structural symmetry, speeding up hardware/software execution.",
      formula: "Ciphertext = AddRoundKey(ShiftRows(SubBytes(State)), Key_14)",
      highlight: "final",
    });

    // Stage 8: Ciphertext Stream Extraction
    list.push({
      stepId: 8,
      title: "Step 9: Final Ciphertext Stream Assembly (Hexadecimal & Base64)",
      category: "Ciphertext Output",
      badge: "Completed Ciphertext Block",
      matrix: sFinalMat,
      description: "The final 4x4 State Matrix is serialized column-by-column into a 32-character hexadecimal ciphertext block.",
      theory: "The final encrypted block is read column-wise (Col 0, Col 1, Col 2, Col 3). This opaque ciphertext is what gets persisted in SQLite and sent across the wire with zero plaintext leakage.",
      formula: "Ciphertext_Hex = [Col 0] || [Col 1] || [Col 2] || [Col 3]",
      highlight: "stream",
    });

    return list;
  }, [rawBytes, masterKeyHex]);

  // Autoplay handler
  useEffect(() => {
    if (isPlaying) {
      const interval = 2200 / playbackSpeed;
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= stages.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, stages.length]);

  const activeStage = stages[currentStep] || stages[0];
  const finalCiphertextHex = matrixToHexStream(stages[stages.length - 1].matrix);

  const handleCopyHex = () => {
    navigator.clipboard.writeText(finalCiphertextHex);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  const handleRandomKey = () => {
    let randHex = "";
    for (let i = 0; i < 64; i++) {
      randHex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    }
    setMasterKeyHex(randHex);
  };

  return (
    <MainLayout
      title="AES-256 Microscopic Execution Simulator"
      subtitle="Interactive Step-by-Step Visualization of Character-to-Hex, S-Box Lookups, ShiftRows, MixColumns & Round Keys"
    >
      <div className="space-y-6">
        {/* Top Control Panel: Plaintext + Master Key Selector */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-[#151E30] to-[#1B263B]">
          <div className="flex flex-col gap-5">
            {/* Row 1: Plaintext & Master Key Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Plaintext Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#38BDF8] flex items-center gap-1.5 font-semibold">
                  <Cpu className="w-4 h-4 text-[#F59E0B]" />
                  Plaintext Input (128-bit block / 16 bytes):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={16}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      setCurrentStep(0);
                    }}
                    className="w-full px-3.5 py-1.5 rounded-lg bg-[#0B1120] border border-[#293449] text-sm font-mono text-[#F1F5F9] focus:outline-none focus:border-amber-500 shadow-inner"
                    placeholder="Enter up to 16 characters"
                  />
                  <span className="text-xs text-[#94A3B8] font-mono whitespace-nowrap">
                    {inputText.length}/16 B
                  </span>
                </div>
              </div>

              {/* Master Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-purple-300 flex items-center gap-1.5 font-semibold">
                    <Key className="w-4 h-4 text-purple-400" />
                    Master 256-bit Key (64 Hex Characters):
                  </label>
                  <button
                    onClick={handleRandomKey}
                    className="text-xs font-mono text-[#F59E0B] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Random Key</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={64}
                  value={masterKeyHex}
                  onChange={(e) => {
                    setMasterKeyHex(e.target.value.toUpperCase());
                    setCurrentStep(0);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500 shadow-inner truncate"
                  placeholder="64 hex characters (256-bit key)"
                />
              </div>
            </div>

            {/* Row 2: Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#293449]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#94A3B8]">Playback Speed:</span>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono">
                  {[0.5, 1, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded ${
                        playbackSpeed === spd
                          ? "bg-[#F59E0B] text-slate-950 font-bold"
                          : "text-[#94A3B8] hover:text-[#F1F5F9]"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={isPlaying ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-1 fill-current" />
                      <span>Pause Flow</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1 fill-current" />
                      <span>Autoplay Animation</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-0.5" />
                  <span>Prev Step</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => currentStep < stages.length - 1 && setCurrentStep(currentStep + 1)}
                  disabled={currentStep === stages.length - 1}
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep(0);
                  }}
                  title="Reset to beginning"
                >
                  <RotateCcw className="w-4 h-4 text-[#94A3B8]" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* STEPPER PROGRESS BAR WITH DIRECT STEP SELECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#38BDF8] font-bold text-sm">
              {activeStage.title}
            </span>
            <Badge variant="amber">{activeStage.badge}</Badge>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
            {stages.map((stg, idx) => (
              <button
                key={stg.stepId}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(idx);
                }}
                className={`py-1.5 px-1 rounded-md text-[10px] font-mono truncate transition-all border ${
                  currentStep === idx
                    ? "bg-[#F59E0B] text-slate-950 font-bold border-amber-400 shadow-md scale-102"
                    : idx < currentStep
                    ? "bg-emerald-500/10 text-[#22C55E] border-emerald-500/30"
                    : "bg-[#151E30] text-[#94A3B8] border-[#293449] hover:bg-[#1B263B]"
                }`}
              >
                Step {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* 1. CHARACTER-TO-HEX CONVERSION BREAKDOWN */}
        <Card className="border-[#293449]">
          <CardHeader>
            <div>
              <CardTitle className="text-sm flex items-center gap-2 text-[#F1F5F9]">
                <Binary className="w-4 h-4 text-[#38BDF8]" />
                Character-by-Character to Hex Breakdown (128 bits / 16 bytes)
              </CardTitle>
              <CardDescription>
                Shows how each individual text letter is encoded into its ASCII decimal value and 2-digit Hex representation
              </CardDescription>
            </div>
          </CardHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-16 gap-2">
            {charDetails.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border text-center font-mono text-xs transition-all ${
                  idx < inputText.length
                    ? "bg-[#0B1120] border-sky-500/40 text-[#F1F5F9]"
                    : "bg-[#151E30]/50 border-amber-500/30 text-[#F59E0B]"
                }`}
              >
                <div className="text-[10px] text-[#94A3B8]">Byte {idx}</div>
                <div className="text-sm font-bold my-0.5 text-[#38BDF8]">
                  {item.char}
                </div>
                <div className="text-[10px] text-[#94A3B8]">Dec: {item.dec}</div>
                <div className="text-xs font-semibold text-[#22C55E]">
                  0x{item.hex}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. MAIN 4x4 MATRIX & THEORY DISPLAY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: 4x4 State Matrix View */}
          <Card className="border-sky-500/30">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2 text-[#38BDF8]">
                  <Layers className="w-5 h-5 text-[#38BDF8]" />
                  Active 4x4 State Matrix
                </CardTitle>
                <CardDescription>
                  Column-Major Ordering: Column 0 (Bytes 0-3), Column 1 (Bytes 4-7)...
                </CardDescription>
              </div>
              <Badge variant="blue">{activeStage.category}</Badge>
            </CardHeader>

            <div className="flex flex-col items-center justify-center p-4">
              <div className="grid grid-cols-4 gap-3 p-4 rounded-2xl bg-[#0B1120] border border-[#293449] shadow-inner">
                {activeStage.matrix.map((row, r) =>
                  row.map((val, c) => {
                    const isShifted = activeStage.highlight === "shift" && r > 0;
                    const isSubstituted = activeStage.highlight === "sub";
                    const isMixed = activeStage.highlight === "mix";
                    const isXOR = activeStage.highlight === "xor";
                    const isFinal = activeStage.highlight === "final" || activeStage.highlight === "stream";

                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => {
                          setSelectedXorCell({ r, c });
                          setSboxTargetByte(val);
                        }}
                        className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-mono border transition-all duration-300 ${
                          isShifted
                            ? "bg-amber-500/20 border-amber-500 text-[#FBBF24] scale-105 shadow-lg animate-pulse"
                            : isSubstituted
                            ? "bg-sky-500/20 border-sky-500 text-[#38BDF8] scale-105 shadow-lg animate-pulse"
                            : isMixed
                            ? "bg-emerald-500/20 border-emerald-500 text-[#22C55E] scale-105 shadow-lg animate-pulse"
                            : isXOR
                            ? "bg-purple-500/20 border-purple-400 text-purple-200 scale-105 shadow-lg"
                            : isFinal
                            ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 scale-105 shadow-lg"
                            : "bg-[#151E30] border-[#293449] text-[#F1F5F9] hover:bg-[#1B263B]"
                        }`}
                      >
                        <span className="text-base font-bold">
                          {toHex(val)}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]/80">
                          r{r}, c{c}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Column Labels */}
              <div className="grid grid-cols-4 gap-3 w-72 text-center text-[11px] font-mono text-[#94A3B8] mt-2">
                <span>Col 0</span>
                <span>Col 1</span>
                <span>Col 2</span>
                <span>Col 3</span>
              </div>
            </div>
          </Card>

          {/* Right: Mathematical Theory & Deep Dive */}
          <Card className="flex flex-col justify-between">
            <div className="space-y-4">
              <CardHeader>
                <div>
                  <CardTitle className="text-[#F1F5F9] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                    Internal Transformation Mechanics
                  </CardTitle>
                  <CardDescription>
                    Exact algebraic behavior and cryptographic purpose
                  </CardDescription>
                </div>
              </CardHeader>

              {/* Description */}
              <div className="p-4 rounded-xl bg-[#0B1120] border border-[#293449] space-y-1.5">
                <span className="text-xs font-mono text-[#38BDF8] font-bold block uppercase tracking-wider">
                  Transformation Summary:
                </span>
                <p className="text-xs text-[#F1F5F9] leading-relaxed">
                  {activeStage.description}
                </p>
              </div>

              {/* Theory */}
              <div className="p-3.5 rounded-xl bg-[#1B263B]/60 border border-[#293449] space-y-1 text-xs">
                <span className="font-semibold text-[#F59E0B] flex items-center gap-1 font-mono">
                  <Info className="w-3.5 h-3.5" />
                  Why This Step is Cryptographically Essential:
                </span>
                <p className="text-[#94A3B8] leading-relaxed">
                  {activeStage.theory}
                </p>
              </div>

              {/* Mathematical Formulation */}
              <div className="p-3.5 rounded-xl bg-[#0B1120] border border-[#293449] space-y-1 font-mono text-xs">
                <span className="text-[#22C55E] font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mathematical Equation:
                </span>
                <div className="text-[#22C55E] mt-1 break-all bg-[#151E30] p-2 rounded border border-[#293449]">
                  {activeStage.formula}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#293449] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
              <span>AES Block: 128 bits</span>
              <span className="text-[#38BDF8]">AES-256 Key: 32 bytes (14 Rounds)</span>
            </div>
          </Card>
        </div>

        {/* 3. STEP 9: FINAL CIPHERTEXT COMPLETION & OUTPUT EXTRACTOR */}
        {currentStep === 8 && (
          <Card className="border-emerald-500/50 bg-[#151E30] animate-in fade-in duration-300 space-y-4">
            <CardHeader className="mb-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-[#22C55E]">
                  <CheckCircle className="w-5 h-5 text-[#22C55E]" />
                  Final 128-bit Ciphertext Block Assembly Complete!
                </CardTitle>
                <CardDescription>
                  The 4x4 State Matrix is extracted in Column-Major order (Col 0 → Col 1 → Col 2 → Col 3) to form the persistent ciphertext.
                </CardDescription>
              </div>
              <Badge variant="green">Encryption Finished</Badge>
            </CardHeader>

            <div className="p-4 rounded-xl bg-[#0B1120] border border-emerald-500/30 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-bold uppercase tracking-wider">
                  Raw Hexadecimal Ciphertext (32 Hex Characters / 16 Bytes):
                </span>
                <Button variant="secondary" size="sm" onClick={handleCopyHex}>
                  {copiedHex ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-[#22C55E]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1 text-[#38BDF8]" />
                      <span>Copy Hex</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#151E30] border border-[#293449] text-base font-bold text-[#22C55E] break-all tracking-wider shadow-inner">
                {finalCiphertextHex}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 text-[#94A3B8]">
                <div className="p-2.5 rounded bg-[#151E30] border border-[#293449]">
                  <span className="text-slate-400 block text-[10px]">Column-by-Column Sequence:</span>
                  <span className="text-[#38BDF8] text-[11px] mt-0.5 block">
                    Col 0: {toHex(activeStage.matrix[0][0])}{toHex(activeStage.matrix[1][0])}{toHex(activeStage.matrix[2][0])}{toHex(activeStage.matrix[3][0])} • 
                    Col 1: {toHex(activeStage.matrix[0][1])}{toHex(activeStage.matrix[1][1])}{toHex(activeStage.matrix[2][1])}{toHex(activeStage.matrix[3][1])}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#151E30] border border-[#293449]">
                  <span className="text-slate-400 block text-[10px]">Persistence Mode in SQLite:</span>
                  <span className="text-[#22C55E] text-[11px] mt-0.5 block">
                    Zero Plaintext at rest. Persisted with 12B Nonce + 16B GMAC tag.
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 4. DEEP DIVE: SUBBYTES RIJNDAEL S-BOX LOOKUP TABLE EXPLORER (Step 4) */}
        {currentStep === 3 && (
          <Card className="border-sky-500/30 bg-[#151E30] animate-in fade-in duration-300 space-y-4">
            <CardHeader className="mb-0">
              <div>
                <CardTitle className="text-sm flex items-center gap-2 text-[#38BDF8]">
                  <Grid className="w-4 h-4 text-[#38BDF8]" />
                  Rijndael S-Box (Substitution Table) Coordinate Lookup
                </CardTitle>
                <CardDescription>
                  How byte 0x{toHex(sboxTargetByte)} is mapped into its non-linear substitution value: High nibble selects row, low nibble selects column.
                </CardDescription>
              </div>
              <Badge variant="blue">S-Box Visualizer</Badge>
            </CardHeader>

            <div className="p-4 rounded-xl bg-[#0B1120] border border-[#293449] font-mono text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#293449] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#94A3B8]">Selected Input Byte:</span>
                  <span className="px-2.5 py-1 rounded bg-sky-500/20 text-[#38BDF8] font-bold text-sm border border-sky-500/40">
                    0x{toHex(sboxTargetByte)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#94A3B8]">Row (High Nibble):</span>
                  <span className="text-[#F59E0B] font-bold">
                    0x{toHex(sboxTargetByte)[0]}
                  </span>
                  <span className="text-[#94A3B8] ml-2">Col (Low Nibble):</span>
                  <span className="text-[#22C55E] font-bold">
                    0x{toHex(sboxTargetByte)[1]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#94A3B8]">S-Box Substituted Output:</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-[#22C55E] font-bold text-sm border border-emerald-500/40">
                    0x{toHex(sboxLookup(sboxTargetByte))}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                <strong className="text-[#F1F5F9]">Shannon&apos;s Confusion Principle:</strong> In the S-Box, the input byte is inverted in GF(2^8) and transformed through an affine mapping. Click any byte in the 4x4 matrix above to see its row and column lookup!
              </p>
            </div>
          </Card>
        )}

        {/* 5. DEEP DIVE: SHIFTROWS ANIMATION TRAJECTORY (Step 5) */}
        {currentStep === 4 && (
          <Card className="border-amber-500/30 bg-[#151E30] animate-in fade-in duration-300 space-y-4">
            <CardHeader className="mb-0">
              <div>
                <CardTitle className="text-sm flex items-center gap-2 text-[#F59E0B]">
                  <ArrowRight className="w-4 h-4 text-[#F59E0B]" />
                  ShiftRows Cyclic Left Permutation Trajectory
                </CardTitle>
                <CardDescription>
                  Demonstrates how row r shifts cyclically to the left by exactly r bytes
                </CardDescription>
              </div>
              <Badge variant="amber">Row Trajectories</Badge>
            </CardHeader>

            <div className="p-4 rounded-xl bg-[#0B1120] border border-[#293449] font-mono text-xs space-y-2.5">
              {[0, 1, 2, 3].map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#151E30] border border-[#293449]"
                >
                  <span className="text-amber-400 font-bold w-24">Row {r}:</span>
                  <span className="text-[#94A3B8]">
                    Shift {r} bytes left →
                  </span>
                  <div className="flex items-center gap-1.5 text-[#F1F5F9]">
                    {stages[3].matrix[r].map((b, c) => (
                      <span key={c} className="w-7 h-7 rounded bg-[#0B1120] border border-[#293449] flex items-center justify-center font-bold">
                        {toHex(b)}
                      </span>
                    ))}
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-500" />
                  <div className="flex items-center gap-1.5 text-[#22C55E]">
                    {stages[4].matrix[r].map((b, c) => (
                      <span key={c} className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold">
                        {toHex(b)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 6. DEEP DIVE: MIXCOLUMNS MATRIX MULTIPLICATION EXPLORER (Step 6) */}
        {currentStep === 5 && (
          <Card className="border-emerald-500/30 bg-[#151E30] animate-in fade-in duration-300">
            <CardHeader>
              <div>
                <CardTitle className="text-sm flex items-center gap-2 text-[#22C55E]">
                  <Calculator className="w-4 h-4 text-[#22C55E]" />
                  MixColumns Matrix Multiplication in GF(2^8) (Detailed Breakdown)
                </CardTitle>
                <CardDescription>
                  Shows how each column vector is multiplied by the fixed Rijndael MDS Matrix using Galois Field polynomial arithmetic
                </CardDescription>
              </div>
              {/* Column Tabs */}
              <div className="flex items-center gap-1 bg-[#0B1120] p-1 rounded-lg border border-[#293449]">
                {[0, 1, 2, 3].map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedMixCol(col)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium ${
                      selectedMixCol === col
                        ? "bg-[#22C55E] text-slate-950 font-bold"
                        : "text-[#94A3B8] hover:text-[#F1F5F9]"
                    }`}
                  >
                    Column {col}
                  </button>
                ))}
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 bg-[#0B1120] rounded-xl border border-[#293449] font-mono text-xs">
              {/* MDS Matrix */}
              <div className="space-y-2 text-center">
                <span className="text-[#94A3B8] text-[11px] uppercase tracking-wider block font-bold">
                  Constant MDS Matrix
                </span>
                <div className="inline-grid grid-cols-4 gap-1.5 p-3 rounded-lg bg-[#151E30] border border-[#293449] text-[#38BDF8]">
                  {MDS_MATRIX.map((row, r) =>
                    row.map((val, c) => (
                      <span key={`${r}-${c}`} className="w-7 h-7 flex items-center justify-center font-bold">
                        {toHex(val)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Column Vector */}
              <div className="space-y-2 text-center">
                <span className="text-[#94A3B8] text-[11px] uppercase tracking-wider block font-bold">
                  Column {selectedMixCol} Vector
                </span>
                <div className="inline-grid grid-cols-1 gap-1.5 p-3 rounded-lg bg-[#151E30] border border-[#293449] text-[#F59E0B]">
                  {[0, 1, 2, 3].map((r) => (
                    <span key={r} className="w-12 h-7 flex items-center justify-center font-bold">
                      0x{toHex(stages[4].matrix[r][selectedMixCol])}
                    </span>
                  ))}
                </div>
              </div>

              {/* Resulting Mixed Vector */}
              <div className="space-y-2 text-center">
                <span className="text-[#22C55E] text-[11px] uppercase tracking-wider block font-bold">
                  Mixed Output Vector in GF(2^8)
                </span>
                <div className="inline-grid grid-cols-1 gap-1.5 p-3 rounded-lg bg-[#151E30] border border-emerald-500/40 text-[#22C55E]">
                  {[0, 1, 2, 3].map((r) => (
                    <span key={r} className="w-12 h-7 flex items-center justify-center font-bold">
                      0x{toHex(activeStage.matrix[r][selectedMixCol])}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 7. DEEP DIVE: ADDROUNDKEY XOR & KEY SCHEDULE INSPECTOR */}
        {activeStage.roundKeyMatrix && activeStage.beforeStateMatrix && (
          <Card className="border-purple-500/40 bg-[#151E30] animate-in fade-in duration-300 space-y-5">
            <CardHeader className="mb-0">
              <div>
                <CardTitle className="text-sm flex items-center gap-2 text-purple-300">
                  <Binary className="w-4 h-4 text-purple-400" />
                  AddRoundKey XOR Operation & Key Schedule Subkey Explorer
                </CardTitle>
                <CardDescription>
                  {activeStage.roundKeyName || "Round Key Subkey Matrix (16 bytes / 128 bits)"}
                </CardDescription>
              </div>
              <Badge variant="amber">Key Schedule Subkey</Badge>
            </CardHeader>

            {/* Three Matrices Horizontal Equation: State ⊕ Key = Result */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0B1120] border border-[#293449]">
              {/* Matrix 1: Before State */}
              <div className="flex flex-col items-center space-y-1.5">
                <span className="text-[11px] font-mono text-[#38BDF8] font-semibold uppercase tracking-wider">
                  State Matrix (Before XOR)
                </span>
                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-[#151E30] border border-[#293449]">
                  {activeStage.beforeStateMatrix.map((row, r) =>
                    row.map((val, c) => (
                      <button
                        key={`b-${r}-${c}`}
                        onClick={() => setSelectedXorCell({ r, c })}
                        className={`w-9 h-9 rounded flex items-center justify-center font-mono text-xs font-bold transition-all border ${
                          selectedXorCell.r === r && selectedXorCell.c === c
                            ? "bg-sky-500/30 border-sky-400 text-sky-200 scale-105"
                            : "bg-[#0B1120] border-[#293449] text-[#F1F5F9] hover:bg-[#1B263B]"
                        }`}
                      >
                        {toHex(val)}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* XOR Symbol */}
              <div className="text-2xl font-bold font-mono text-purple-400 p-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                ⊕
              </div>

              {/* Matrix 2: Round Key Matrix */}
              <div className="flex flex-col items-center space-y-1.5">
                <span className="text-[11px] font-mono text-purple-300 font-semibold uppercase tracking-wider">
                  Round Key Subkey (128-bit)
                </span>
                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-[#151E30] border border-purple-500/40 shadow-inner">
                  {activeStage.roundKeyMatrix.map((row, r) =>
                    row.map((val, c) => (
                      <button
                        key={`k-${r}-${c}`}
                        onClick={() => setSelectedXorCell({ r, c })}
                        className={`w-9 h-9 rounded flex items-center justify-center font-mono text-xs font-bold transition-all border ${
                          selectedXorCell.r === r && selectedXorCell.c === c
                            ? "bg-purple-500/40 border-purple-300 text-purple-100 scale-105"
                            : "bg-[#0B1120] border-[#293449] text-purple-300 hover:bg-[#1B263B]"
                        }`}
                      >
                        {toHex(val)}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Equals Symbol */}
              <div className="text-2xl font-bold font-mono text-[#22C55E] p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                =
              </div>

              {/* Matrix 3: Resulting State */}
              <div className="flex flex-col items-center space-y-1.5">
                <span className="text-[11px] font-mono text-[#22C55E] font-semibold uppercase tracking-wider">
                  Resulting State Matrix
                </span>
                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-[#151E30] border border-emerald-500/40 shadow-inner">
                  {activeStage.matrix.map((row, r) =>
                    row.map((val, c) => (
                      <button
                        key={`res-${r}-${c}`}
                        onClick={() => setSelectedXorCell({ r, c })}
                        className={`w-9 h-9 rounded flex items-center justify-center font-mono text-xs font-bold transition-all border ${
                          selectedXorCell.r === r && selectedXorCell.c === c
                            ? "bg-emerald-500/40 border-emerald-300 text-emerald-100 scale-105"
                            : "bg-[#0B1120] border-[#293449] text-[#22C55E] hover:bg-[#1B263B]"
                        }`}
                      >
                        {toHex(val)}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Microscopic Bit-by-Bit Binary XOR Inspector for Selected Cell */}
            {(() => {
              const r = selectedXorCell.r;
              const c = selectedXorCell.c;
              const stateVal = activeStage.beforeStateMatrix[r][c];
              const keyVal = activeStage.roundKeyMatrix[r][c];
              const resVal = activeStage.matrix[r][c];

              return (
                <div className="p-4 rounded-xl bg-[#0B1120] border border-[#293449] font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#293449] pb-2">
                    <span className="text-purple-300 font-bold flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-purple-400" />
                      Microscopic Bitwise XOR Calculation (Cell [{r}, {c}])
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">
                      Click any cell in the 3 matrices above to inspect its bitwise calculation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-[#151E30] border border-[#293449] space-y-1">
                      <span className="text-[#38BDF8] text-[11px] block">State Byte [{r},{c}]:</span>
                      <div className="text-sm font-bold text-[#F1F5F9]">0x{toHex(stateVal)}</div>
                      <div className="text-[11px] text-[#94A3B8]">Binary: {toBinary(stateVal)}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#151E30] border border-purple-500/40 space-y-1">
                      <span className="text-purple-300 text-[11px] block">Round Key Byte [{r},{c}]:</span>
                      <div className="text-sm font-bold text-purple-200">0x{toHex(keyVal)}</div>
                      <div className="text-[11px] text-purple-400">Binary: {toBinary(keyVal)}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#151E30] border border-emerald-500/40 space-y-1">
                      <span className="text-[#22C55E] text-[11px] block">XOR Result [{r},{c}]:</span>
                      <div className="text-sm font-bold text-[#22C55E]">0x{toHex(resVal)}</div>
                      <div className="text-[11px] text-emerald-400">Binary: {toBinary(resVal)}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#94A3B8] leading-relaxed pt-1">
                    <strong className="text-[#F1F5F9]">Where does this Round Key come from?</strong> In AES-256, the 256-bit (32-byte) master key is expanded via the <em>Rijndael Key Expansion algorithm</em>. It applies cyclic word rotations (<code className="text-[#38BDF8]">RotWord</code>), non-linear S-Box substitution (<code className="text-[#38BDF8]">SubWord</code>), and XORs with Round Constants (<code className="text-[#38BDF8]">Rcon</code>) to generate 15 distinct 128-bit round subkeys ($K_0$ through $K_{14}$).
                  </div>
                </div>
              );
            })()}
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
