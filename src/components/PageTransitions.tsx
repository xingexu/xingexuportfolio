"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, startTransition, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Navigate = (href: string, options: { replace?: boolean; scroll?: boolean }) => void;
const NavigationContext = createContext<Navigate | null>(null);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Keep the sky and navigation steady while route content fades between pages. */
export default function PageTransitions({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const animation = useRef<Animation | null>(null);
  const navigating = useRef(false);
  const recovery = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    const content = document.getElementById("page-content");
    navigating.current = false;
    clearTimeout(recovery.current);
    animation.current?.cancel();
    if (content && !reducedMotion()) {
      animation.current = content.animate(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
    return () => {
      animation.current?.cancel();
      clearTimeout(recovery.current);
    };
  }, [pathname]);

  const navigate = useCallback<Navigate>(async (href, options) => {
    if (navigating.current) return;
    navigating.current = true;
    const content = document.getElementById("page-content");
    animation.current?.cancel();
    if (content && !reducedMotion()) {
      animation.current = content.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 170,
        easing: "ease-in",
        fill: "forwards",
      });
      try { await animation.current.finished; } catch { navigating.current = false; return; }
    }
    // A failed or superseded navigation must never leave the current page hidden.
    recovery.current = setTimeout(() => {
      animation.current?.cancel();
      navigating.current = false;
    }, 8000);
    startTransition(() => {
      if (options.replace) router.replace(href, { scroll: options.scroll });
      else router.push(href, { scroll: options.scroll });
    });
  }, [router]);

  return <NavigationContext.Provider value={navigate}>{children}</NavigationContext.Provider>;
}

/** Next's onNavigate preserves modified clicks, downloads, and external links. */
export function TransitionLink({ href, onNavigate, replace, scroll, ...props }: ComponentProps<typeof NextLink>) {
  const navigate = useContext(NavigationContext);
  const pathname = usePathname();
  return <NextLink {...props} href={href} replace={replace} scroll={scroll} onNavigate={(event) => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented || !navigate || typeof href !== "string") return;
    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname === pathname) return;
    event.preventDefault();
    navigate(href, { replace, scroll });
  }} />;
}
