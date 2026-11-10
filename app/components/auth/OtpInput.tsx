"use client";
import { useState, useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function OtpInput({ length = 4, onComplete, disabled, error }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(new Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    if (value && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (newValues.every((v) => v.length === 1)) {
      onComplete(newValues.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted.length === length) {
      const newValues = pasted.split("");
      setValues(newValues);
      inputs.current[length - 1]?.focus();
      onComplete(pasted);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3 justify-center">
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => { inputs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            className="w-14 h-14 rounded-xl text-center text-2xl font-bold outline-none transition-all focus:ring-2"
            style={{
              background: "var(--ink, #0d0a14)",
              border: `2px solid ${error ? "rgb(239 68 68)" : "var(--line, #2a2537)"}`,
              color: "var(--text, #f0eff4)",
              // @ts-expect-error
              "--tw-ring-color": "var(--cyan, #00d4aa)",
            }}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  );
}
