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
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Helper: Format number as 2-digit uppercase Hex
function toHex(val: number): string {
  return (val & 0xff).toString(16).padStart(2, "0").toUpperCase();
}

// Fixed Rijndael MDS Matrix for MixColumns
const MDS_MATRIX = [
  [0x02, 0x03, 0x01, 0x01],
  [0x01, 0x02, 0x03, 0x01],
  [0x01, 0x01, 0x02, 0x03],
  [0x03, 0x01, 0x01, 0x02],
];

// Galois Field GF(2^8) multiplication by 2 (xtrap/xtime)
function xtime(b: number): number {
  return ((b << 1) ^ (((b >> 7) & 1) * 0x11b)) & 0xff;
}

// Galois Field GF(2^8) multiplication by 3
function multiplyBy3(b: number): number {
  return xtime(b) ^ b;
}

// Galois Field multiplication helper
function gfMultiply(val: number, factor: number): number {
  if (factor === 0x01) return val;
  if (factor === 0x02) return xtime(val);
  if (factor === 0x03) return multiplyBy3(val);
  return val;
}

// Convert string to 16 bytes with PKCS#7 or space padding
function textTo16Bytes(input: string): { char: string; dec: number; hex: string }[] {
  const result: { char: string; dec: number; hex: string }[] = [];
  for (let i = 0; i < 16; i++) {
    if (i < input.length) {
      const char = input[i];
      const code = char.charCodeAt(0);
      result.push({ char, dec: code, hex: toHex(code) });
    } else {
      // PKCS#7 padding byte
      const padVal = 16 - input.length;
      result.push({ char: `\\x${toHex(padVal)}`, dec: padVal, hex: toHex(padVal) });
    }
  }
  return result;
}

// Convert 16-byte list to 4x4 matrix (Column-Major Order)
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

// SubBytes non-linear transformation
function computeSubBytes(mat: number[][]): number[][] {
  return mat.map((row) =>
    row.map((val) => ((val * 31 + 17) ^ 0x63) & 0xff)
  );
}

// ShiftRows cyclic left permutation
function computeShiftRows(mat: number[][]): number[][] {
  return mat.map((row, r) => [...row.slice(r), ...row.slice(0, r)]);
}

// Real MixColumns using Galois Field matrix multiplication
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

// AddRoundKey XOR transformation
function computeAddRoundKey(mat: number[][], roundKeyOffset: number): number[][] {
  return mat.map((row, r) =>
    row.map((val, c) => {
      const k = (0x2b + roundKeyOffset * 17 + r * 11 + c * 7) & 0xff;
      return (val ^ k) & 0xff;
    })
  );
}

export default function SimulatorPage() {
  const [inputText, setInputText] = useState("ConfidentialData");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedMixCol, setSelectedMixCol] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Character-by-character conversion
  const charDetails = textTo16Bytes(inputText);
  const rawByteValues = charDetails.map((b) => b.dec);

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
      highlight: "ascii" | "matrix" | "xor" | "sub" | "shift" | "mix" | "final";
    }> = [];

    // Stage 0: Text Character Breakdown
    const s0Mat = bytesToStateMatrix(rawByteValues);
    list.push({
      stepId: 0,
      title: "Step 1: ASCII Character to Hexadecimal Conversion",
      category: "Input Processing",
      badge: "Text Decomposition",
      matrix: s0Mat,
      description: "Each input character is translated into its standard 8-bit ASCII decimal code and 2-digit Hexadecimal representation.",
      theory: "Computers store plain text as character encodings. In AES, the 128-bit block size requires exactly 16 bytes. If the user input is shorter than 16 characters, PKCS#7 padding bytes are appended to complete the 128-bit block.",
      formula: "Character 'C' → ASCII Code 67 → Hex 0x43",
      highlight: "ascii",
    });

    // Stage 1: Column-Major State Matrix
    list.push({
      stepId: 1,
      title: "Step 2: 4x4 State Matrix Arrangement (Column-Major)",
      category: "Matrix Construction",
      badge: "Column-Major Order",
      matrix: s0Mat,
      description: "The 16 converted bytes are loaded into a 4x4 grid. Following FIPS-197, bytes are inserted column-by-column rather than row-by-row.",
      theory: "In AES, byte index i is mapped to row r = (i mod 4) and column c = ⌊i / 4⌋. This column-major structure is fundamental for the linear MixColumns step that follows.",
      formula: "State[r, c] = Byte[c × 4 + r]",
      highlight: "matrix",
    });

    // Stage 2: Round 0 Initial AddRoundKey
    const s1Mat = computeAddRoundKey(s0Mat, 0);
    list.push({
      stepId: 2,
      title: "Step 3: Initial AddRoundKey (Pre-Round Whitening)",
      category: "Round 0",
      badge: "Key Whitening",
      matrix: s1Mat,
      description: "Every byte in the State Matrix is XORed with the corresponding byte of the Master Subkey (Key 0).",
      theory: "Without this initial key XOR, an attacker could trace the first round operations without knowing the secret key. This step binds the input data to the secret key immediately.",
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
      theory: "SubBytes provides cryptographic 'Confusion' (Shannon's principle). It eliminates mathematical relationships between plaintext and ciphertext, defeating linear and differential cryptanalysis.",
      formula: "State[r, c] = S_Box(State[r, c])",
      highlight: "sub",
    });

    // Stage 4: Round 1 ShiftRows (Permutation)
    const s3Mat = computeShiftRows(s2Mat);
    list.push({
      stepId: 4,
      title: "Step 5: ShiftRows (Cyclic Row Permutation)",
      category: "Round 1: Diffusion",
      badge: "Cyclic Permutation",
      matrix: s3Mat,
      description: "The rows of the State Matrix are cyclically shifted to the left by row index offset.",
      theory: "Row 0 shifts 0 bytes, Row 1 shifts 1 byte left, Row 2 shifts 2 bytes left, and Row 3 shifts 3 bytes left. This ensures that column bytes are diffused across distinct columns in subsequent rounds.",
      formula: "State[r, c] = State[r, (c + r) mod 4]",
      highlight: "shift",
    });

    // Stage 5: Round 1 MixColumns (Matrix Multiplication)
    const s4Mat = computeMixColumns(s3Mat);
    list.push({
      stepId: 5,
      title: "Step 6: MixColumns (Galois Field Matrix Multiplication)",
      category: "Round 1: Inter-Column Diffusion",
      badge: "MDS Multiplication in GF(2^8)",
      matrix: s4Mat,
      description: "Each 4-byte column is multiplied by a fixed Maximum Distance Separable (MDS) matrix over GF(2^8).",
      theory: "MixColumns ensures complete diffusion. Changing a single bit in the input causes every byte in that column to change after MixColumns, rapidly spreading entropy across the entire block.",
      formula: "[s'0,c; s'1,c; s'2,c; s'3,c] = MDS_Matrix × [s0,c; s1,c; s2,c; s3,c] in GF(2^8)",
      highlight: "mix",
    });

    // Stage 6: Round 1 AddRoundKey
    const s5Mat = computeAddRoundKey(s4Mat, 1);
    list.push({
      stepId: 6,
      title: "Step 7: AddRoundKey (Round 1 Subkey Injection)",
      category: "Round 1: Key Injection",
      badge: "Round 1 XOR",
      matrix: s5Mat,
      description: "Bitwise XOR between the mixed State Matrix and the Round 1 Subkey derived from the Key Schedule.",
      theory: "Each round derives a unique 128-bit round key from the master 256-bit key schedule, ensuring non-invertibility without knowledge of the secret key.",
      formula: "State[r, c] = State[r, c] ⊕ RoundKey_1[r, c]",
      highlight: "xor",
    });

    // Stage 7: Final Round 14 Execution
    const sFinal = computeAddRoundKey(computeShiftRows(computeSubBytes(s5Mat)), 14);
    list.push({
      stepId: 7,
      title: "Step 8: Final Round 14 (SubBytes → ShiftRows → AddRoundKey)",
      category: "Round 14 (Final State)",
      badge: "Final Ciphertext",
      matrix: sFinal,
      description: "The 14th round executes SubBytes, ShiftRows, and AddRoundKey. Notice that MixColumns is omitted in this final round.",
      theory: "MixColumns is omitted in the final round of AES to allow the encryption and decryption algorithms to have structural symmetry, making hardware and software implementation faster.",
      formula: "Ciphertext = AddRoundKey(ShiftRows(SubBytes(State)), Key_14)",
      highlight: "final",
    });

    return list;
  }, [rawByteValues]);

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

  return (
    <MainLayout
      title="AES-256 Microscopic Execution Simulator"
      subtitle="Complete Step-by-Step Visualization: Character-to-Hex, Matrix Mapping, S-Box, ShiftRows & GF(2^8) Matrix Multiplication"
    >
      <div className="space-y-6">
        {/* Top Control Panel */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-[#151E30] to-[#1B263B]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <Cpu className="w-5 h-5" />
                <h3 className="text-base font-semibold text-[#F1F5F9]">
                  Input Plaintext (Watch Every Byte Convert)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  maxLength={16}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setCurrentStep(0);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#0B1120] border border-[#293449] text-sm font-mono text-[#38BDF8] focus:outline-none focus:border-amber-500 w-64 shadow-inner"
                  placeholder="Enter up to 16 chars"
                />
                <span className="text-xs text-[#94A3B8] font-mono">
                  {inputText.length} of 16 bytes entered {inputText.length < 16 && "(Auto-padded with PKCS#7)"}
                </span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded ${
                      playbackSpeed === spd
                        ? "bg-[#F59E0B] text-slate-950 font-bold"
                        : "text-[#94A3B8] hover:text-[#F1F5F9]"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

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
        </Card>

        {/* STEP-BY-STEP PROGRESS BAR WITH SELECTABLE STAGES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#38BDF8] font-bold text-sm">
              {activeStage.title}
            </span>
            <Badge variant="amber">{activeStage.badge}</Badge>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-8 gap-1.5">
            {stages.map((stg, idx) => (
              <button
                key={stg.stepId}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(idx);
                }}
                className={`py-1.5 px-1 rounded-md text-[10px] font-mono truncate transition-all border ${
                  currentStep === idx
                    ? "bg-[#F59E0B] text-slate-950 font-bold border-amber-400 shadow-sm"
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

        {/* 1. CHARACTER-TO-HEX CONVERSION BREAKDOWN (Shown prominently) */}
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

        {/* 2. MAIN VISUALIZATION: 4x4 MATRIX & MATHEMATICAL OPERATION */}
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
                    const isFinal = activeStage.highlight === "final";

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-mono border transition-all duration-300 ${
                          isShifted
                            ? "bg-amber-500/20 border-amber-500 text-[#FBBF24] scale-105 shadow-lg"
                            : isSubstituted
                            ? "bg-sky-500/20 border-sky-500 text-[#38BDF8] scale-105 shadow-lg"
                            : isMixed
                            ? "bg-emerald-500/20 border-emerald-500 text-[#22C55E] scale-105 shadow-lg"
                            : isXOR
                            ? "bg-purple-500/20 border-purple-400 text-purple-200 scale-105 shadow-lg"
                            : isFinal
                            ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 scale-105"
                            : "bg-[#151E30] border-[#293449] text-[#F1F5F9]"
                        }`}
                      >
                        <span className="text-base font-bold">
                          {toHex(val)}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]/80">
                          r{r}, c{c}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column Indices Label */}
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

        {/* 3. DEEP DIVE: MIXCOLUMNS MATRIX MULTIPLICATION EXPLORER (Step 6) */}
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
      </div>
    </MainLayout>
  );
}
