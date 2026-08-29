import { LINKS } from "@/app/data";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./PixelIcons";

/** Footer with theme-aware official social marks in pixel-style buttons. */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        position: "relative",
        zIndex: 10,
        background: "var(--panel-solid)",
        borderTop: "2px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "16px 28px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>© {year} xinge xu</span>

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
