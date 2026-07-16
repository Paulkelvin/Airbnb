import React from "react";

/**
 * A few small glyphs Heroicons doesn't ship (bed, bath, wifi) — hand-drawn
 * to match Heroicons' own 24x24 outline conventions (stroke="currentColor",
 * strokeWidth 1.5, round caps/joins) so they sit visually consistent
 * alongside real Heroicons elsewhere in the app.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

export function BedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v2M21 18v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12V7a1 1 0 011-1h6a1 1 0 011 1v3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V8a1 1 0 011-1h5a2 2 0 012 2v3" />
    </svg>
  );
}

export function BathIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12V6a2 2 0 012-2 2 2 0 012 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v4a4 4 0 004 4h8a4 4 0 004-4v-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20v1M17 20v1" />
    </svg>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8.5a10 10 0 0114 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.8 11.8a6 6 0 018.4 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 15a2 2 0 012.8 0" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.5c0-.87.24-1.46 1.48-1.46H16.5V4.36C16.23 4.32 15.32 4.25 14.26 4.25c-2.2 0-3.7 1.34-3.7 3.8V10.5H8.5v3h2.06V21h2.94z" />
    </svg>
  );
}

export function TwitterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 3H21.7l-6.1 7 7.2 9.5h-5.6l-4.4-5.8L7.7 19.5H4.9l6.5-7.5L4.5 3h5.7l4 5.3L18.9 3zm-1 15h1.5L8.2 4.5H6.6L17.9 18z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
