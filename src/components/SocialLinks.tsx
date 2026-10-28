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
      {SOCIAL_LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn"
          aria-label={label}
          title={label}
        >
          <Icon size={placement === "hero" ? 26 : 20} />
        </a>
      ))}
    </nav>
  );
}
