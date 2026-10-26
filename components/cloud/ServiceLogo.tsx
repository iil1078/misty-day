import type { DestinationId } from "@/lib/cloud/types";

/** Simplified, recognisable marks for each service (illustrative, not official artwork). */
const MARKS: Record<DestinationId, React.ReactNode> = {
  download: (
    <>
      <rect width="32" height="32" rx="8" fill="#334155" />
      <path d="M16 8v11m0 0l-4.5-4.5M16 19l4.5-4.5M9.5 23.5h13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  email: (
    <>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <rect x="7.5" y="10" width="17" height="12.5" rx="2" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M8.5 11.5l7.5 5.5 7.5-5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  "google-sheets": (
    <>
      <rect width="32" height="32" rx="8" fill="#e6f4ea" />
      <path d="M10 6.5h8.5l4.5 4.5v14a1.5 1.5 0 01-1.5 1.5h-11.5a1.5 1.5 0 01-1.5-1.5v-17a1.5 1.5 0 011.5-1.5z" fill="#0f9d58" />
      <path d="M18.5 6.5V11h4.5z" fill="#87ceac" />
      <path d="M11.5 14h9v8h-9zM11.5 17h9M11.5 19.5h9M15 14v8" stroke="#fff" strokeWidth="1.2" fill="none" />
    </>
  ),
  "google-drive": (
    <>
      <rect width="32" height="32" rx="8" fill="#f8fafc" />
      <path d="M12.6 7.5h6.8l7 12h-6.8z" fill="#ffba00" />
      <path d="M12.6 7.5L5.6 19.5l3.4 5.9 7-12z" fill="#0f9d58" />
      <path d="M9 25.4h14l3.4-5.9h-14z" fill="#4285f4" />
    </>
  ),
  dropbox: (
    <>
      <rect width="32" height="32" rx="8" fill="#0061fe" />
      <path d="M11 8l-5 3.2 5 3.2 5-3.2zM21 8l-5 3.2 5 3.2 5-3.2zM6 17.6l5 3.2 5-3.2-5-3.2zM21 14.4l-5 3.2 5 3.2 5-3.2zM11 22l5 3.2 5-3.2-5-3.2z" fill="#fff" />
    </>
  ),
  onedrive: (
    <>
      <rect width="32" height="32" rx="8" fill="#0364b8" />
      <path d="M12.5 22.5h12a4 4 0 00.7-7.9 6 6 0 00-11.3-1.8 4.9 4.9 0 00-6.4 4.7 5 5 0 005 5z" fill="#fff" />
    </>
  ),
  notion: (
    <>
      <rect width="32" height="32" rx="8" fill="#fff" stroke="#e2e8f0" />
      <rect x="7.5" y="7" width="17" height="18" rx="2.5" fill="#fff" stroke="#111" strokeWidth="1.8" />
      <path d="M12 21.5v-11l8 11v-11" stroke="#111" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </>
  ),
  slack: (
    <>
      <rect width="32" height="32" rx="8" fill="#4a154b" />
      <rect x="13" y="6.5" width="3.4" height="10" rx="1.7" fill="#36c5f0" />
      <rect x="15.6" y="15.6" width="3.4" height="10" rx="1.7" fill="#e01e5a" />
      <rect x="6.5" y="15.6" width="10" height="3.4" rx="1.7" fill="#2eb67d" />
      <rect x="15.6" y="13" width="10" height="3.4" rx="1.7" fill="#ecb22e" />
    </>
  ),
};

export function ServiceLogo({ id, className = "h-8 w-8" }: { id: DestinationId; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden>
      {MARKS[id]}
    </svg>
  );
}

export function SpendwiseLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[60%] w-[60%]" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M16 13h2" />
      </svg>
    </span>
  );
}
