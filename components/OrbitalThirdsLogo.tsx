/**
 * OrbitalThirdsLogo Component
 * 
 * Animated orbital logo with three energy cycles representing High, Medium, Low energy states.
 * Available in horizontal, stacked, and icon variants with light/dark themes.
 */

interface OrbitalThirdsLogoProps {
  size?: number;
  variant?: "horizontal" | "stacked" | "icon";
  theme?: "light" | "dark";
}

export default function OrbitalThirdsLogo({
  size = 200,
  variant = "horizontal",
  theme = "light",
}: OrbitalThirdsLogoProps) {
  const textColor = theme === "dark" ? "#FFFFFF" : "#1a1a1a"

  if (variant === "icon") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <radialGradient id="orbit-center">
            <stop offset="0%" stopColor={theme === "dark" ? "#ffffff" : "#1a1a1a"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={theme === "dark" ? "#ffffff" : "#1a1a1a"} stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Center point */}
        <circle cx="50" cy="50" r="6" fill="url(#orbit-center)" />

        {/* Orbital paths */}
        <circle
          cx="50"
          cy="50"
          r="25"
          stroke={theme === "dark" ? "#ffffff" : "#1a1a1a"}
          strokeWidth="1"
          fill="none"
          opacity="0.15"
        />

        {/* Three orbiting elements at 120° intervals */}
        <circle cx="50" cy="25" r="8" fill="#3b82f6" opacity="0.9">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="71.65" cy="62.5" r="8" fill="#8b5cf6" opacity="0.9">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="120 50 50"
            to="480 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="28.35" cy="62.5" r="8" fill="#ec4899" opacity="0.9">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="240 50 50"
            to="600 50 50"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    )
  }

  if (variant === "stacked") {
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 200 240" fill="none">
        <defs>
          <radialGradient id="orbit-center-stacked">
            <stop offset="0%" stopColor={textColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={textColor} stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Logo mark */}
        <circle cx="100" cy="50" r="8" fill="url(#orbit-center-stacked)" />
        <circle cx="100" cy="50" r="30" stroke={textColor} strokeWidth="1.5" fill="none" opacity="0.15" />

        <circle cx="100" cy="20" r="10" fill="#3b82f6" opacity="0.9" />
        <circle cx="126" cy="65" r="10" fill="#8b5cf6" opacity="0.9" />
        <circle cx="74" cy="65" r="10" fill="#ec4899" opacity="0.9" />

        {/* Wordmark */}
        <text
          x="100"
          y="130"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="48"
          fontWeight="700"
          fill={textColor}
          textAnchor="middle"
        >
          Thirds
        </text>

        {/* Tagline */}
        <text
          x="100"
          y="155"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="14"
          fontWeight="400"
          fill={textColor}
          textAnchor="middle"
          opacity="0.6"
        >
          ENERGY CYCLES
        </text>
      </svg>
    )
  }

  return (
    <svg width={size * 2} height={size * 0.5} viewBox="0 0 400 100" fill="none">
      <defs>
        <radialGradient id="orbit-center-horiz">
          <stop offset="0%" stopColor={textColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={textColor} stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Logo mark */}
      <circle cx="70" cy="50" r="6" fill="url(#orbit-center-horiz)" />
      <circle cx="70" cy="50" r="25" stroke={textColor} strokeWidth="1.5" fill="none" opacity="0.15" />

      <circle cx="70" cy="25" r="8" fill="#3b82f6" opacity="0.9" />
      <circle cx="91.65" cy="62.5" r="8" fill="#8b5cf6" opacity="0.9" />
      <circle cx="48.35" cy="62.5" r="8" fill="#ec4899" opacity="0.9" />

      {/* Wordmark */}
      <text
        x="145"
        y="62"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="42"
        fontWeight="700"
        fill={textColor}
      >
        Thirds
      </text>

      {/* Tagline */}
      <text
        x="145"
        y="80"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="400"
        fill={textColor}
        opacity="0.6"
        letterSpacing="1"
      >
        ENERGY CYCLES
      </text>
    </svg>
  )
}
