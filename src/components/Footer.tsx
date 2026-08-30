import { LINKS } from "@/app/data";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./PixelIcons";

/** Footer with theme-aware official social marks in pixel-style buttons. */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-copyright">© {year} xinge xu</span>

        <nav aria-label="Social and contact" style={{ display: "flex", gap: 14 }}>
          {[
            { label: "GitHub", href: LINKS.github, Icon: GitHubIcon },
            { label: "LinkedIn", href: LINKS.linkedin, Icon: LinkedInIcon },
            { label: "Email xxu767@uwo.ca", href: LINKS.email, Icon: MailIcon },
          ].map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              aria-label={label}
              title={label}
            >
              <Icon size={20} />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
