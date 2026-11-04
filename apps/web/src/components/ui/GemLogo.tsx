const GEM_PATH =
  "M50,4 L53,44 L50,50 L47,44 Z M50,96 L53,56 L50,50 L47,56 Z M4,50 L44,47 L50,50 L44,53 Z M96,50 L56,47 L50,50 L56,53 Z M18,18 L44,44 L50,50 L44,44 Z M82,18 L56,44 L50,50 L56,44 Z M18,82 L44,56 L50,50 L44,56 Z M82,82 L56,56 L50,50 L56,56 Z";

export function GemLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d={GEM_PATH} fill="#F0BC40" />
      <circle cx="50" cy="50" r="4" fill="#F0BC40" />
    </svg>
  );
}

export function StarWatermark() {
  return (
    <svg width="540" height="540" viewBox="0 0 100 100" opacity={0.12}>
      <path d={GEM_PATH} fill="#F0BC40" />
      <circle cx="50" cy="50" r="4" fill="#F0BC40" />
    </svg>
  );
}
