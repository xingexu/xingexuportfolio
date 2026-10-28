import { LINKS } from "@/app/data";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./PixelIcons";

const SOCIAL_LINKS = [
  { label: "GitHub", href: LINKS.github, Icon: GitHubIcon },
  { label: "LinkedIn", href: LINKS.linkedin, Icon: LinkedInIcon },
  { label: "Email xxu767@uwo.ca", href: LINKS.email, Icon: MailIcon },
];

type SocialLinksProps = {
  placement?: "hero" | "footer";
  className?: string;
};

export default function SocialLinks({ placement = "footer", className = "" }: SocialLinksProps) {
  return (
    <nav aria-label="Social and contact" className={`social-links social-links-${placement} ${className}`}>
      {placement === "hero" && (
        <span className="social-links-label hero-subtitle hero-education font-pixel">
          let&apos;s connect
          <svg className="social-links-arrow" width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
            <path fill="currentColor" d="M7 1h2v8h2V7h2v4h-2v2H9v2H7v-2H5v-2H3V7h2v2h2Z" />
          </svg>
        </span>
      )}
      {SOCIAL_LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={placement === "hero" ? "social-icon-btn px-btn px-btn-secondary" : "icon-btn"}
          aria-label={label}
          title={label}
        >
          <Icon size={placement === "hero" ? 26 : 20} />
        </a>
      ))}
    </nav>
  );
}
