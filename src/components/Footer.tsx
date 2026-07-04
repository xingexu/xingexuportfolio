import { LINKS } from "@/app/data";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./PixelIcons";

/**
 * Footer. Transparent — floats over the skyline/water so the scene is
 * uninterrupted. Crawlable contact links as pixel icons.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ position: "relative", zIndex: 10 }}>
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "18px 28px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>© {year} xinge xu</span>

        <nav aria-label="Social and contact" style={{ display: "flex", gap: 18 }}>
          {[
            { label: "GitHub", href: LINKS.github, Icon: GitHubIcon },
            { label: "LinkedIn", href: LINKS.linkedin, Icon: LinkedInIcon },
            { label: "Email xxu767@uwo.ca", href: LINKS.email, Icon: MailIcon },
          ].map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="icon-link"
              aria-label={label}
              title={label}
            >
              <Icon size={16} />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
