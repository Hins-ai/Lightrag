interface BusIconProps {
  className?: string
}

export default function BusIcon({ className }: BusIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 44"
      className={className}
      aria-hidden="true"
    >
      {/* Bus roof */}
      <rect x="6" y="0" width="46" height="12" rx="5" fill="#b84a1a" />
      {/* Bus body */}
      <rect x="2" y="8" width="60" height="26" rx="6" fill="#e8622c" />
      {/* Windshield (front-right) */}
      <rect x="46" y="12" width="12" height="14" rx="3" fill="#fde8c8" />
      {/* Window 1 */}
      <rect x="6" y="12" width="13" height="11" rx="2.5" fill="#fde8c8" />
      {/* Window 2 */}
      <rect x="22" y="12" width="13" height="11" rx="2.5" fill="#fde8c8" />
      {/* Door */}
      <rect x="38" y="18" width="6" height="14" rx="1.5" fill="#c04a1a" />
      {/* Front bumper accent */}
      <rect x="58" y="28" width="4" height="4" rx="1" fill="#c04a1a" />
      {/* Rear bumper accent */}
      <rect x="2" y="28" width="4" height="4" rx="1" fill="#c04a1a" />
      {/* Wheel left */}
      <circle cx="14" cy="38" r="6" fill="#4a2c0a" />
      <circle cx="14" cy="38" r="2.5" fill="#7a4f2a" />
      {/* Wheel right */}
      <circle cx="50" cy="38" r="6" fill="#4a2c0a" />
      <circle cx="50" cy="38" r="2.5" fill="#7a4f2a" />
      {/* Headlight */}
      <rect x="59" y="20" width="3" height="5" rx="1" fill="#fde8c8" />
    </svg>
  )
}
