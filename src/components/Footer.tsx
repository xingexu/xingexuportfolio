"use client";

import { usePathname } from "next/navigation";
import SocialLinks from "./SocialLinks";

/** Footer with theme-aware official social marks in pixel-style buttons. */
export default function Footer() {
  const pathname = usePathname();
  // Computed on the fly so the copyright year never goes stale.
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-copyright">© {year} xinge xu</span>

        {pathname !== "/" && <SocialLinks />}
      </div>
    </footer>
  );
}
