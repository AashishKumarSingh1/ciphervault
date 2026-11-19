import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-[#F1F5F9] tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border text-sm text-[#F1F5F9] placeholder-[#94A3B8]/50 focus:outline-none focus:ring-1 transition-all ${
            error
              ? "border-red-500/80 focus:ring-red-500 focus:border-red-500"
              : "border-[#293449] focus:ring-amber-500/80 focus:border-amber-500/80"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
        {helperText && !error && (
          <p className="text-[11px] text-[#94A3B8] font-mono">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
