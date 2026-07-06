interface Props {
  children: React.ReactNode;
  variant?: "art" | "flat";
}

/**
 * Spotify-style gradient banner sitting behind a page's header block.
 * No per-image color extraction (CORS/complexity) — a fixed brand-tinted
 * gradient that fades into the page background.
 */
export default function PageHero({ children, variant = "art" }: Props) {
  return (
    <div className="relative -mx-8 -mt-6 mb-8 px-8 pt-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: variant === "art" ? 320 : 160,
          background:
            variant === "art"
              ? "linear-gradient(to bottom, var(--color-primary-container) 0%, rgba(107,35,43,0.25) 45%, transparent 100%)"
              : "linear-gradient(to bottom, var(--color-primary-container) 0%, transparent 100%)",
          opacity: variant === "art" ? 0.5 : 0.3,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
