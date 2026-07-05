import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaults = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PipelineIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="15" cy="18" r="2" />
    </svg>
  );
}

export function CrmIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M6.5 16c.5-1.7 1.3-2.5 2.5-2.5s2 .8 2.5 2.5M14 9h3M14 13h3" />
    </svg>
  );
}

export function TemplatesIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v5h4M10 12h6M10 16h6" />
    </svg>
  );
}

export function BattlesheetIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function ClientsIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M7 20v-2.2c0-2 1.8-3.8 4-3.8h2c2.2 0 4 1.8 4 3.8V20" />
      <circle cx="12" cy="8" r="3.5" />
      <path d="M17 8.5a3 3 0 0 1 2.5 3v1.7M7 8.5a3 3 0 0 0-2.5 3v1.7" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export function FinanceIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      <path d="m4 7 6-4 6 7 5-4" />
    </svg>
  );
}
