import { useId } from "react";

/**
 * Small inline flags for the language choices. SVG rather than emoji flags:
 * Windows does not draw flag emoji (it shows the letters "FR" / "GB").
 */
export function Flag({ language, className = "h-4 w-6" }: { language: "fr" | "en"; className?: string }) {
  const id = useId();

  if (language === "fr") {
    return (
      <svg viewBox="0 0 3 2" className={`${className} shrink-0 rounded-[2px] border border-black/10`} role="img" aria-label="France">
        <rect width="1" height="2" fill="#0055A4" />
        <rect x="1" width="1" height="2" fill="#FFFFFF" />
        <rect x="2" width="1" height="2" fill="#EF4135" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 60 30" className={`${className} shrink-0 rounded-[2px] border border-black/10`} role="img" aria-label="United Kingdom">
      <clipPath id={`${id}-s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}-t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
