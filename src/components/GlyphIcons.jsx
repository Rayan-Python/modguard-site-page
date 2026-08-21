// Minimal line icons, shared across the doc/flow cards. All inherit currentColor.
function Svg({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const FileGlyph = () => (
  <Svg>
    <path d="M7 3 H14 L18 7 V21 H7 Z" />
    <path d="M14 3 V7 H18" />
    <line x1="9.5" y1="12" x2="15" y2="12" />
    <line x1="9.5" y1="15.5" x2="15" y2="15.5" />
  </Svg>
)

export const ScanGlyph = () => (
  <Svg>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <line x1="15.5" y1="15.5" x2="21" y2="21" />
    <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" />
  </Svg>
)

export const FingerprintGlyph = () => (
  <Svg>
    <path d="M6 12a6 6 0 0 1 12 0v3" />
    <path d="M9 11.5a3 3 0 0 1 6 0V16" />
    <path d="M12 12v5" />
    <path d="M6.5 16v1" />
    <path d="M17.5 17.5v.5" />
  </Svg>
)

export const NoEyeGlyph = () => (
  <Svg>
    <path d="M3.5 12C6 7.5 18 7.5 20.5 12c-2.5 4.5-14.5 4.5-17 0Z" />
    <circle cx="12" cy="12" r="2.4" />
    <line x1="4" y1="20" x2="20" y2="4" />
  </Svg>
)

export const DocCheckGlyph = () => (
  <Svg>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
)

export const InfoGlyph = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="7.8" r="0.7" fill="currentColor" stroke="none" />
  </Svg>
)

export const ScaleGlyph = () => (
  <Svg>
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="6" y1="7" x2="18" y2="7" />
    <path d="M3 13 6 7 9 13" />
    <path d="M15 13 18 7 21 13" />
    <line x1="8" y1="20" x2="16" y2="20" />
  </Svg>
)

export const UserGlyph = () => (
  <Svg>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
  </Svg>
)

export const DeviceGlyph = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <line x1="9" y1="21" x2="15" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </Svg>
)

export const DatabaseGlyph = () => (
  <Svg>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v12c0 1.6 3.1 3 7 3s7-1.4 7-3V6" />
    <path d="M5 12c0 1.6 3.1 3 7 3s7-1.4 7-3" />
  </Svg>
)

export const ExternalGlyph = () => (
  <Svg>
    <path d="M13 5H5.5a1 1 0 0 0-1 1v12.5a1 1 0 0 0 1 1H18a1 1 0 0 0 1-1V11" />
    <path d="M15 4h5v5" />
    <line x1="20" y1="4" x2="11" y2="13" />
  </Svg>
)

export const MinorsGlyph = () => (
  <Svg>
    <circle cx="8.5" cy="8" r="3" />
    <path d="M3.5 20c0-3.6 2.4-5.5 5-5.5s5 1.9 5 5.5" />
    <circle cx="17" cy="11" r="2.1" />
    <path d="M13.6 20c0-2.5 1.5-3.9 3.4-3.9s3.4 1.4 3.4 3.9" />
  </Svg>
)

export const RefreshGlyph = () => (
  <Svg>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 4v4h-4" />
  </Svg>
)

export const MailGlyph = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M4 7l8 6 8-6" />
  </Svg>
)

export const DownloadGlyph = () => (
  <Svg>
    <path d="M12 4v10" />
    <path d="M8 10l4 4 4-4" />
    <path d="M5 19h14" />
  </Svg>
)

export const ShieldCheckGlyph = () => (
  <Svg>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
)
