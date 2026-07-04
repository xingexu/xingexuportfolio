/**
 * Pixel-art social icons drawn on a coarse grid (crispEdges, currentColor)
 * to match the scene's uniform pixel language.
 */

type IconProps = { size?: number };

export function GitHubIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      {/* invertocat: pointy ears, round head, eye knockouts, chin, paws + tail */}
      <rect x="2" y="0" width="2" height="1" fill="currentColor" />
      <rect x="8" y="0" width="2" height="1" fill="currentColor" />
      <rect x="1" y="1" width="10" height="2" fill="currentColor" />
      <rect x="0" y="3" width="12" height="2" fill="currentColor" />
      <rect x="0" y="5" width="2" height="1" fill="currentColor" />
      <rect x="3" y="5" width="6" height="1" fill="currentColor" />
      <rect x="10" y="5" width="2" height="1" fill="currentColor" />
      <rect x="0" y="6" width="12" height="1" fill="currentColor" />
      <rect x="1" y="7" width="10" height="1" fill="currentColor" />
      <rect x="2" y="8" width="8" height="1" fill="currentColor" />
      <rect x="0" y="8" width="1" height="1" fill="currentColor" />
      <rect x="0" y="9" width="2" height="1" fill="currentColor" />
      <rect x="4" y="9" width="1" height="2" fill="currentColor" />
      <rect x="7" y="9" width="1" height="2" fill="currentColor" />
      <rect x="3" y="11" width="2" height="1" fill="currentColor" />
      <rect x="6" y="11" width="2" height="1" fill="currentColor" />
    </svg>
  );
}

export function LinkedInIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden>
      {/* "in" glyph */}
      <rect x="1" y="1" width="1" height="1" fill="currentColor" />
      <rect x="1" y="3" width="1" height="6" fill="currentColor" />
      <rect x="4" y="3" width="1" height="6" fill="currentColor" />
      <rect x="5" y="3" width="2" height="1" fill="currentColor" />
      <rect x="7" y="4" width="1" height="5" fill="currentColor" />
    </svg>
  );
}

export function MailIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden>
      {/* envelope: border + flap */}
      <rect x="0" y="1" width="10" height="1" fill="currentColor" />
      <rect x="0" y="8" width="10" height="1" fill="currentColor" />
      <rect x="0" y="2" width="1" height="6" fill="currentColor" />
      <rect x="9" y="2" width="1" height="6" fill="currentColor" />
      <rect x="1" y="2" width="1" height="1" fill="currentColor" />
      <rect x="8" y="2" width="1" height="1" fill="currentColor" />
      <rect x="2" y="3" width="1" height="1" fill="currentColor" />
      <rect x="7" y="3" width="1" height="1" fill="currentColor" />
      <rect x="3" y="4" width="1" height="1" fill="currentColor" />
      <rect x="6" y="4" width="1" height="1" fill="currentColor" />
      <rect x="4" y="5" width="2" height="1" fill="currentColor" />
    </svg>
  );
}
