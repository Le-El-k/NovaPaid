"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getAssetPath } from "@/app/lib/asset-path";

/**
 * Full-screen processing loader shown while a transfer or withdrawal is being
 * executed. Shows the NovaPaid logo (icon only, no wordmark) in the centre with
 * a circular progress ring that spins around and fills from 0% to 100%. When it
 * reaches 100% it calls `onComplete` so the parent can finalize the operation.
 *
 * `active`   – mount/show the loader and start the animation from 0.
 * `duration` – ms to go from 0 to 100 (default ~2200ms).
 * `label`    – short status text under the ring.
 * `onComplete` – called once the ring reaches 100%.
 */
export function NovaProgressLoader({
  active,
  duration = 2200,
  label,
  onComplete,
}: {
  active: boolean;
  duration?: number;
  label?: string;
  onComplete?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      doneRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    doneRef.current = false;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        // tiny pause at 100% so the fill is visible before we resolve
        setTimeout(() => onComplete?.(), 260);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, duration, onComplete]);

  if (!active) return null;

  const size = 132;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - progress / 100);

  return (
    <div className="np-loader-overlay" role="status" aria-live="polite" aria-label={label || "Traitement en cours"}>
      <div className="np-loader-box">
        <div className="np-loader-ring-wrap" style={{ width: size, height: size }}>
          <svg className="np-loader-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
              <linearGradient id="npLoaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2f6fed" />
                <stop offset="100%" stopColor="#6f55e9" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(47,111,237,0.12)"
              strokeWidth={stroke}
            />
            <circle
              className="np-loader-ring-progress"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#npLoaderGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <span className="np-loader-logo">
            <Image
              src={getAssetPath("/novapaid-logo-96.png")}
              alt="NovaPaid"
              width={60}
              height={60}
              priority
            />
          </span>
        </div>
        <div className="np-loader-pct">{progress}%</div>
        {label && <div className="np-loader-label">{label}</div>}
      </div>
    </div>
  );
}
