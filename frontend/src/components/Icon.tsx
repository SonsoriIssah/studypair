interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

// Thin wrapper around the Material Symbols Outlined font (loaded in
// index.html). `filled` toggles the FILL axis for the "active" look the
// mockups use on selected nav items and status icons.
export default function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span className={`material-symbols-outlined ${filled ? 'icon-filled' : ''} ${className}`}>
      {name}
    </span>
  );
}
