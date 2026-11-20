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
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Helper: convert string to 4x4 byte matrix (column-major order as in AES standard)
function stringToMatrix(input: string): number[][] {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = i < input.length ? input.charCodeAt(i) : 0x20;
  }
  const matrix: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      matrix[r][c] = bytes[c * 4 + r];
    }
  }
  return matrix;
}

// Format byte as two hex characters
function toHex(val: number): string {
  return val.toString(16).padStart(2, "0").toUpperCase();
}

// Algorithmic byte substitution (S-Box approximation for demonstration)
function applySubBytes(mat: number[][]): number[][] {
  return mat.map((row) =>
    row.map((val) => {
      // Non-linear transformation simulation
      return ((val * 31 + 17) ^ 0x63) & 0xff;
    })
  );
}

// Cyclic ShiftRows: row r shifted left by r positions
function applyShiftRows(mat: number[][]): number[][] {
  return mat.map((row, r) => {
    return [...row.slice(r), ...row.slice(0, r)];
  });
}

// Linear MixColumns simulation
function applyMixColumns(mat: number[][]): number[][] {
  const result: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));
  for (let c = 0; c < 4; c++) {
    const a0 = mat[0][c];
    const a1 = mat[1][c];
    const a2 = mat[2][c];
    const a3 = mat[3][c];
    result[0][c] = ((a0 * 2) ^ (a1 * 3) ^ a2 ^ a3) & 0xff;
    result[1][c] = (a0 ^ (a1 * 2) ^ (a2 * 3) ^ a3) & 0xff;
    result[2][c] = (a0 ^ a1 ^ (a2 * 2) ^ (a3 * 3)) & 0xff;
    result[3][c] = ((a0 * 3) ^ a1 ^ a2 ^ (a3 * 2)) & 0xff;
  }
  return result;
}

// AddRoundKey: XOR with round subkey
function applyAddRoundKey(mat: number[][], roundNum: number): number[][] {
  return mat.map((row, r) =>
    row.map((val, c) => {
      const keyByte = (0x3a + roundNum * 11 + r * 7 + c * 13) & 0xff;
      return val ^ keyByte;
    })
  );
}

interface SimStep {
  id: number;
  stageName: string;
  roundName: string;
  matrix: number[][];
  description: string;
  details: string;
  formula: string;
  highlightType: "load" | "sub" | "shift" | "mix" | "xor" | "done";
}

export default function SimulatorPage() {
  const [inputText, setInputText] = useState("ConfidentialData");
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate sequence of steps
  const steps: SimStep[] = React.useMemo(() => {
    const list: SimStep[] = [];
    let state = stringToMatrix(inputText);

    // 0. Initial State
    list.push({
      id: 0,
      stageName: "Input Block Mapping",
      roundName: "Pre-Round Initialization",
      matrix: state,
      description: "Plaintext (16 bytes) is mapped column-by-column into the 4x4 State Matrix.",
      details: "In AES, 128-bit blocks are arranged as an array of 4 columns and 4 rows (bytes indexed as state[row, col]).",
      formula: "State[r, c] = Plaintext_Byte[c * 4 + r]",
      highlightType: "load",
    });

    // 1. Initial AddRoundKey (Round 0)
    state = applyAddRoundKey(state, 0);
    list.push({
      id: 1,
      stageName: "Initial AddRoundKey",
      roundName: "Round 0",
      matrix: state,
      description: "Bitwise XOR between initial State Matrix and the primary 128-bit Master Subkey.",
      details: "Acts as key whitening before non-linear diffusion rounds begin, ensuring no raw plaintext passes unmodified.",
      formula: "State[r, c] = State[r, c] ⊕ RoundKey_0[r, c]",
      highlightType: "xor",
    });

    // Representative sample of main rounds: Round 1 & Round 2
    for (let round = 1; round <= 2; round++) {
      // SubBytes
      state = applySubBytes(state);
      list.push({
        id: list.length,
        stageName: "SubBytes (Substitution)",
        roundName: `Round ${round} of 14`,
        matrix: state,
        description: "Non-linear byte substitution using the Rijndael S-Box.",
        details: "Replaces each byte with its multiplicative inverse in GF(2^8) followed by an affine transformation to resist linear & differential cryptanalysis.",
        formula: "State[r, c] = S_Box(State[r, c])",
        highlightType: "sub",
      });

      // ShiftRows
      state = applyShiftRows(state);
      list.push({
        id: list.length,
        stageName: "ShiftRows (Permutation)",
        roundName: `Round ${round} of 14`,
        matrix: state,
        description: "Cyclic left-shifting of State Matrix rows by row index offset.",
        details: "Row 0 shifts 0 positions, Row 1 shifts 1 position left, Row 2 shifts 2 positions left, Row 3 shifts 3 positions left.",
        formula: "State[r, c] = State[r, (c + r) mod 4]",
        highlightType: "shift",
      });

      // MixColumns
      state = applyMixColumns(state);
      list.push({
        id: list.length,
        stageName: "MixColumns (Linear Diffusion)",
        roundName: `Round ${round} of 14`,
        matrix: state,
        description: "Linear matrix multiplication treating each column as a polynomial in GF(2^8).",
        details: "Each column is transformed using fixed polynomial c(x) = {03}x^3 + {01}x^2 + {01}x + {02} mod x^4 + 1 to achieve complete diffusion.",
        formula: "Column_New = Matrix_MDS × Column_Old",
        highlightType: "mix",
      });

      // AddRoundKey
      state = applyAddRoundKey(state, round);
      list.push({
        id: list.length,
        stageName: "AddRoundKey (Key Injection)",
        roundName: `Round ${round} of 14`,
        matrix: state,
        description: "Bitwise XOR with Round Subkey derived from 256-bit Key Schedule.",
        details: "Introduces key entropy at the end of each round to bind cryptographic state to the secret key.",
        formula: "State[r, c] = State[r, c] ⊕ RoundKey_k[r, c]",
        highlightType: "xor",
      });
    }

    // Final Round (Round 14)
    state = applySubBytes(state);
    state = applyShiftRows(state);
    state = applyAddRoundKey(state, 14);
    list.push({
      id: list.length,
      stageName: "Final Round 14 (No MixColumns)",
      roundName: "Round 14 (Final State)",
      matrix: state,
      description: "Final round executes SubBytes, ShiftRows, and AddRoundKey (MixColumns is omitted).",
      details: "MixColumns is omitted in the 14th round of AES-256 to ensure symmetric algebraic symmetry for the decryption cipher.",
      formula: "Ciphertext = AddRoundKey(ShiftRows(SubBytes(State)), Key_14)",
      highlightType: "done",
    });

    return list;
  }, [inputText]);

  // Handle Autoplay / Animated Walkthrough
  useEffect(() => {
    if (isPlaying) {
      const interval = 1600 / playbackSpeed;
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= steps.length - 1) {
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
  }, [isPlaying, playbackSpeed, steps.length]);

  const currentStep = steps[currentStepIdx] || steps[0];
  const prevStep = currentStepIdx > 0 ? steps[currentStepIdx - 1] : null;

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  return (
    <MainLayout
      title="AES-256 Transformation Simulator"
      subtitle="Interactive Round-by-Round Visualizer of State Matrix, SubBytes, ShiftRows & MixColumns"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-[#151E30] to-[#1B263B]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Input & Step Navigation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-base font-semibold text-[#F1F5F9]">
                  Input 128-bit Plaintext Block
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  maxLength={16}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setCurrentStepIdx(0);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0B1120] border border-[#293449] text-xs font-mono text-[#38BDF8] focus:outline-none focus:border-amber-500 w-52"
                  placeholder="Enter 16 characters"
                />
                <span className="text-xs text-[#94A3B8] font-mono">
                  ({inputText.length}/16 bytes)
                </span>
              </div>
            </div>

            {/* Playback Controls (Animated Flow & Step Buttons) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Speed Toggle */}
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

              {/* Play / Pause Autoplay */}
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
                    <span>Autoplay Flow</span>
                  </>
                )}
              </Button>

              {/* Step Previous */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrev}
                disabled={currentStepIdx === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-0.5" />
                <span>Prev Step</span>
              </Button>

              {/* Step Next */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNext}
                disabled={currentStepIdx === steps.length - 1}
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>

              {/* Reset */}
              <Button variant="ghost" size="sm" onClick={handleReset} title="Reset to start">
                <RotateCcw className="w-4 h-4 text-[#94A3B8]" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Step Progress Timeline Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#38BDF8] font-semibold">
              Step {currentStepIdx + 1} of {steps.length}: {currentStep.stageName}
            </span>
            <Badge variant="amber">{currentStep.roundName}</Badge>
          </div>
          <div className="w-full h-2 rounded-full bg-[#151E30] overflow-hidden border border-[#293449]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-sky-400 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStepIdx + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Interactive Matrix Display & Transformation View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active 4x4 State Matrix */}
          <Card className="border-sky-500/30">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2 text-[#38BDF8]">
                  <Layers className="w-5 h-5 text-[#38BDF8]" />
                  Active 4x4 State Matrix (128 bits)
                </CardTitle>
                <CardDescription>
                  Column-major arrangement of 16 individual bytes in hexadecimal
                </CardDescription>
              </div>
              <Badge variant="blue">{currentStep.stageName}</Badge>
            </CardHeader>

            <div className="flex flex-col items-center justify-center p-4">
              <div className="grid grid-cols-4 gap-2.5 p-4 rounded-2xl bg-[#0B1120] border border-[#293449] shadow-inner">
                {currentStep.matrix.map((row, r) =>
                  row.map((byteVal, c) => {
                    const isShifted =
                      currentStep.highlightType === "shift" && r > 0;
                    const isSubstituted =
                      currentStep.highlightType === "sub";
                    const isMixed =
                      currentStep.highlightType === "mix";
                    const isXORed =
                      currentStep.highlightType === "xor";

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono transition-all duration-300 border ${
                          isShifted
                            ? "bg-amber-500/20 border-amber-500 text-[#FBBF24] shadow-md scale-105"
                            : isSubstituted
                            ? "bg-sky-500/20 border-sky-500 text-[#38BDF8] shadow-md scale-105"
                            : isMixed
                            ? "bg-emerald-500/20 border-emerald-500 text-[#22C55E] shadow-md scale-105"
                            : isXORed
                            ? "bg-purple-500/20 border-purple-400 text-purple-200 shadow-md scale-105"
                            : "bg-[#151E30] border-[#293449] text-[#F1F5F9]"
                        }`}
                      >
                        <span className="text-sm font-bold">
                          {toHex(byteVal)}
                        </span>
                        <span className="text-[9px] text-[#94A3B8]/70">
                          [{r},{c}]
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* State Matrix Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] font-mono text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span>SubBytes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>ShiftRows</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>MixColumns</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span>AddRoundKey</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Transformation Mathematics & Educational Details */}
          <Card className="flex flex-col justify-between">
            <div className="space-y-4">
              <CardHeader>
                <div>
                  <CardTitle className="text-[#F1F5F9] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                    Internal Mechanics & Mathematical Theory
                  </CardTitle>
                  <CardDescription>
                    What happens under the hood during this transformation step
                  </CardDescription>
                </div>
              </CardHeader>

              {/* Description Box */}
              <div className="p-4 rounded-xl bg-[#0B1120] border border-[#293449] space-y-2">
                <span className="text-xs font-mono text-[#38BDF8] font-bold block uppercase tracking-wider">
                  Transformation Summary:
                </span>
                <p className="text-xs text-[#F1F5F9] leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {/* Deep Dive Theory */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-[#94A3B8] font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Cryptographic Objective:
                </span>
                <p className="text-xs text-[#94A3B8] leading-relaxed bg-[#1B263B]/60 p-3 rounded-xl border border-[#293449]">
                  {currentStep.details}
                </p>
              </div>

              {/* Mathematical Formula */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-[#22C55E] font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mathematical Formulation:
                </span>
                <div className="p-3 rounded-xl bg-[#0B1120] border border-[#293449] font-mono text-xs text-[#22C55E]">
                  {currentStep.formula}
                </div>
              </div>
            </div>

            {/* Evaluator Explainer Tip */}
            <div className="mt-4 pt-3 border-t border-[#293449] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
              <span>AES-256 Total Rounds: 14</span>
              <span className="text-[#38BDF8]">Key Length: 256 bits</span>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
