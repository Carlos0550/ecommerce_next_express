"use client";
import type { CSSProperties } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

export type IconName =
  | "search"
  | "cart"
  | "user"
  | "heart"
  | "grid"
  | "home"
  | "box"
  | "tag"
  | "receipt"
  | "cash"
  | "users"
  | "chart"
  | "settings"
  | "logout"
  | "plus"
  | "minus"
  | "check"
  | "close"
  | "chevronRight"
  | "chevronDown"
  | "arrow"
  | "filter"
  | "star"
  | "trash"
  | "edit"
  | "barcode"
  | "card"
  | "wallet"
  | "package"
  | "calendar"
  | "bell"
  | "menu"
  | "download"
  | "eye"
  | "mail"
  | "lock"
  | "whatsapp"
  | "palette";

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 18,
  color,
  style,
  strokeWidth = 1.6,
}: Props) {
  const t = usePaletteTokens();
  const c = color || t.text;
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.4 11.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1.2" />
        <circle cx="17" cy="20" r="1.2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
    heart: (
      <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z" />
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    home: (
      <>
        <path d="M3 11 12 3l9 8" />
        <path d="M5 10v10h14V10" />
      </>
    ),
    box: (
      <>
        <path d="M3 7 12 3l9 4v10l-9 4-9-4V7z" />
        <path d="m3 7 9 4 9-4M12 11v10" />
      </>
    ),
    tag: (
      <>
        <path d="M20 12 12 20l-8-8V4h8z" />
        <circle cx="8" cy="8" r="1.2" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c.8-3.2 3-5 6-5s5.2 1.8 6 5" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M20 18c-.4-2-1.6-3.2-3.5-3.6" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-5 3 3 5-7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 13 4 4L19 7" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5z" />,
    star: <path d="m12 3 2.7 5.8 6.3.6-4.7 4.4 1.4 6.2L12 17l-5.7 3 1.4-6.2L3 9.4l6.3-.6L12 3z" />,
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7M9 7V4h6v3" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>
    ),
    barcode: <path d="M4 6v12M7 6v12M10 6v12M13 6v12M16 6v12M19 6v12" />,
    card: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" />
        <path d="M16 13h2M5 7V5a1 1 0 0 1 1-1h11v3" />
      </>
    ),
    package: (
      <>
        <path d="m7 3 5 3 5-3M3 7l9 5 9-5M12 12v10" />
        <path d="M3 7v10l9 5 9-5V7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    download: <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />,
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20.5 12a8.5 8.5 0 1 1-15.8 4.3L3 21l4.8-1.6A8.5 8.5 0 0 1 20.5 12z" />
        <path d="M8.5 9.5c.4 2.5 2.5 4.6 5 5l1.5-1.5-2-.8-1 1a4 4 0 0 1-2-2l1-1-.8-2L8.5 9.5z" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.5 1.5-1.3 0-1-.6-1.3-.6-2.3 0-.8.6-1.4 1.4-1.4H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z" />
        <circle cx="7.5" cy="10.5" r="1" />
        <circle cx="12" cy="7.5" r="1" />
        <circle cx="16.5" cy="10.5" r="1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}

export default Icon;
