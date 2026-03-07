"use client";

import { cn } from "@/lib/utils";

export function AnimatedLockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block size-3.5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <defs>
        <style>{`
          .lock-shackle {
            stroke-dasharray: 30;
            animation: shackle-close 0.35s cubic-bezier(0.4, 0, 0.6, 1) both;
          }
          @keyframes shackle-close {
            0% {
              stroke-dashoffset: 11.3;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .lock-shackle {
              animation: none !important;
              stroke-dashoffset: 0 !important;
            }
          }
        `}</style>
      </defs>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path className="lock-shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function AnimatedUnlockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block size-3.5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <defs>
        <style>{`
          .unlock-shackle {
            stroke-dasharray: 30;
            animation: shackle-open 0.35s cubic-bezier(0.2, 0.8, 0.4, 1) both;
          }
          @keyframes shackle-open {
            0% {
              stroke-dashoffset: 0;
            }
            100% {
              stroke-dashoffset: 11.3;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .unlock-shackle {
              animation: none !important;
              stroke-dashoffset: 11.3 !important;
            }
          }
        `}</style>
      </defs>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path className="unlock-shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
