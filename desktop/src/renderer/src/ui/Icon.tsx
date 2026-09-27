// Simple line icons (24×24, stroke = current text colour) for dashboards, help and buttons.
const PATHS: Record<string, string[]> = {
  map: ['M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z', 'M9 4v14', 'M15 6v14'],
  pulse: ['M3 12h4l2-6 4 12 2-6h6'],
  shield: ['M12 3 5 6v6c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-3z', 'm9 12 2 2 4-4'],
  flask: ['M9 3h6', 'M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3', 'M7.5 15h9'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  help: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6', 'M12 17h.01'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z', 'M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z'],
  play: ['M7 4v16l13-8L7 4z'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'm20 20-4-4'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
};

export const ICON_NAMES = Object.keys(PATHS);

export interface IconProps {
  name: string;
  size?: number;
  title?: string;
}

export function Icon({ name, size = 18, title }: IconProps) {
  const paths = PATHS[name] ?? PATHS.help;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
