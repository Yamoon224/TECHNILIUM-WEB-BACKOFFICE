/**
 * Small inline flags for the language choices (France, United States). SVG rather than emoji
 * flags: Windows does not draw flag emoji (it shows the letters "FR" / "US").
 */
export function Flag({ language, className = "h-4 w-6" }: { language: "fr" | "en"; className?: string }) {
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
    <svg viewBox="0 0 19 10" className={`${className} shrink-0 rounded-[2px] border border-black/10`} role="img" aria-label="United States">
      <rect width="19" height="10" fill="#FFFFFF" />
      {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
        <rect key={stripe} y={(stripe * 10) / 13} width="19" height={10 / 13} fill="#B22234" />
      ))}
      <rect width="7.6" height={(7 * 10) / 13} fill="#3C3B6E" />
      {Array.from({ length: 9 }, (_, row) =>
        Array.from({ length: row % 2 === 0 ? 6 : 5 }, (_, column) => (
          <circle
            key={`${row}-${column}`}
            cx={(row % 2 === 0 ? 0.65 : 1.27) + column * 1.27}
            cy={0.55 + row * 0.55}
            r="0.2"
            fill="#FFFFFF"
          />
        )),
      )}
    </svg>
  );
}
