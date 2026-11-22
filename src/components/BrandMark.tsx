import React from 'react';

export function BrandMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-violet-600" />
      <path
        d="M16 6L23.5 23.5L16 19.5L8.5 23.5L16 6Z"
        className="fill-white"
      />
      <circle cx="16" cy="14.5" r="2" className="fill-violet-500 dark:fill-slate-900" />
    </svg>
  );
}
