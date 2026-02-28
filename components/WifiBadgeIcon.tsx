type WifiBadgeIconProps = {
  className?: string;
};

export default function WifiBadgeIcon({ className = "" }: WifiBadgeIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-label="WiFi"
      role="img"
      className={`inline-block h-5 w-5 align-[-0.12em] text-[#166534] ${className}`.trim()}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2">
        <path d="M3 8.8a10.4 10.4 0 0 1 14 0" />
        <path d="M5.7 11.3a6.6 6.6 0 0 1 8.6 0" />
        <path d="M8.3 13.8a2.8 2.8 0 0 1 3.4 0" />
      </g>
      <circle cx="10" cy="16.2" r="1.3" fill="currentColor" />
    </svg>
  );
}
