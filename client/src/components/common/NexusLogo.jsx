import React, { useId } from 'react';

/**
 * Nexus brand logo component.
 * Features the signature squircle icon with the bold white 'N' and vibrant mint accent mark.
 *
 * @param {number|string} size - Size in pixels for width/height (default: 40)
 * @param {string} className - Optional wrapper CSS class
 * @param {boolean} showText - Whether to show the wordmark "nexus." alongside the icon
 * @param {string} subtitle - Optional tagline text below wordmark (e.g. "A little more connected.")
 * @param {string} textClassName - Custom classes for wordmark text
 * @param {'icon'|'mark'|'watermark'} variant - Display variant
 * @param {boolean} glow - Subtle ambient glow behind the mint accent
 */
export default function NexusLogo({
  size = 40,
  className = '',
  showText = false,
  subtitle = '',
  textClassName = '',
  variant = 'icon',
  glow = false,
}) {
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9]/g, '_');
  const gradId = `nexusGrad_${safeId}`;
  const glowId = `nexusGlow_${safeId}`;
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 40;

  // Watermark version for hero backgrounds
  if (variant === 'watermark') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M 14.5 33.5 V 14.5 L 33.5 33.5 V 14.5"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34.5" cy="34" r="3.2" fill="currentColor" />
      </svg>
    );
  }

  const iconElement = (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${glow ? 'drop-shadow-[0_4px_16px_rgba(101,84,217,0.35)]' : ''}`}
      role="img"
      aria-label="Nexus"
    >
      <defs>
        {/* Rich vibrant brand gradient with unique scoped ID */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7866FA" />
          <stop offset="55%" stopColor="#6251E6" />
          <stop offset="100%" stopColor="#4E3DCF" />
        </linearGradient>

        {/* Mint accent glow filter with unique scoped ID */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Modern squircle background with solid color fallback + gradient */}
      <rect width="48" height="48" rx="14" fill="#6251E6" />
      <rect width="48" height="48" rx="14" fill={`url(#${gradId})`} />

      {/* Subtle top-inner highlight border for premium glass/app-icon feel */}
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="13.25"
        stroke="white"
        strokeOpacity="0.22"
        strokeWidth="1"
        fill="none"
      />

      {/* Signature 'N' letterform with rounded joints and caps */}
      <path
        d="M 14.5 33.5 V 14.5 L 33.5 33.5 V 14.5"
        stroke="white"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Neon mint/cyan accent mark at bottom right */}
      <circle
        cx="34.2"
        cy="34"
        r="3.2"
        fill="#2EE59D"
        filter={`url(#${glowId})`}
      />
      {/* Inner bright core of the mint accent */}
      <circle
        cx="34.2"
        cy="34"
        r="1.6"
        fill="#A7F3D0"
      />
    </svg>
  );

  if (!showText) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{iconElement}</span>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {iconElement}
      <div className="flex flex-col justify-center">
        <span className={`font-display font-extrabold text-xl tracking-[-0.05em] leading-tight block ${textClassName}`}>
          nexus<span className="text-[var(--color-primary)]">.</span>
        </span>
        {subtitle && (
          <span className="text-[10px] text-[var(--color-on-surface-variant)] tracking-wide">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
