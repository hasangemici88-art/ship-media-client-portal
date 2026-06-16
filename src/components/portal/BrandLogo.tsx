export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 210 54"
      role="img"
      aria-label="Ship Media Digital"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="#111827">
        <path d="M17.8 38.4c-3.7-1.8-6.9-4.4-9.4-7.8l5.9-3.4c2.1 2.4 4.8 4.2 7.9 5.2l3.3-18.8h6.2l-3.4 19.2c3.3-.8 6.2-2.6 8.6-5.3l5.7 3.5c-2.7 3.5-6.2 6.1-10.4 7.7l-6.7 2.7-7.7-3Z" />
        <path d="M18.7 13.6h19.8l-3 5.1H21.8l-3.1-5.1Z" />
        <path d="M27.8 5.8h7.1v5h-7.1z" />
        <path d="M20.7 22.4h3.9v5.4h-3.9zM33.7 22.4h3.9v5.4h-3.9z" />
      </g>
      <g fill="#111827" fontFamily="Inter, Arial, sans-serif" fontWeight="900" letterSpacing="-.04em">
        <text x="58" y="23" fontSize="22">
          SHIP MEDIA
        </text>
        <text x="58" y="43" fontSize="22">
          DIGITAL
        </text>
      </g>
    </svg>
  );
}
