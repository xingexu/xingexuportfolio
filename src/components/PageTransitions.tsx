"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, startTransition, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { createRoomTransition, type RoomTransition } from "@/lib/room-transition";

type Navigate = (href: string, options: { replace?: boolean; scroll?: boolean }) => void;
const NavigationContext = createContext<Navigate | null>(null);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The room has a full-scene entrance; other routes retain their small content fade. */
export default function PageTransitions({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const animation = useRef<Animation | null>(null);
  const navigating = useRef(false);
  const recovery = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const roomTransition = useRef<RoomTransition | null>(null);
  const navigationId = useRef(0);
  const skipRoomEntrance = useRef(false);

  useLayoutEffect(() => {
    if (!canvas.current) return;
    const transition = createRoomTransition(canvas.current);
    roomTransition.current = transition;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        skipRoomEntrance.current = navigating.current;
        transition.clear();
      }
    };
    const motionChanged = () => { if (motion.matches) transition.clear(); };
    const visibilityChanged = () => { if (document.hidden) transition.clear(); };
    const resized = () => transition.clear();
    window.addEventListener("keydown", skip);
    motion.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("resize", resized);
    return () => {
      navigationId.current += 1;
      transition.clear();
      roomTransition.current = null;
      window.removeEventListener("keydown", skip);
      motion.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("resize", resized);
    };
  }, []);

  useLayoutEffect(() => {
    const content = document.getElementById("page-content");
    navigationId.current += 1;
    navigating.current = false;
    clearTimeout(recovery.current);
    animation.current?.cancel();
    if (pathname === "/about" && !skipRoomEntrance.current && !reducedMotion() && !document.hidden) {
      void roomTransition.current?.enter();
    } else {
      roomTransition.current?.clear();
    }
    skipRoomEntrance.current = false;
    if (pathname !== "/about" && content && !reducedMotion()) {
      animation.current = content.animate(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
    return () => {
      animation.current?.cancel();
      clearTimeout(recovery.current);
      roomTransition.current?.clear();
    };
  }, [pathname]);

  const navigate = useCallback<Navigate>(async (href, options) => {
    if (navigating.current) return;
    navigating.current = true;
    const request = ++navigationId.current;
    const content = document.getElementById("page-content");
    animation.current?.cancel();
    const enteringRoom = new URL(href, window.location.href).pathname === "/about";
    if (enteringRoom && !reducedMotion() && !document.hidden) {
      router.prefetch(href);
      await roomTransition.current?.close();
      if (request !== navigationId.current) return;
    } else if (content && !reducedMotion()) {
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
      roomTransition.current?.clear();
    }, 8000);
    startTransition(() => {
      if (options.replace) router.replace(href, { scroll: options.scroll });
      else router.push(href, { scroll: options.scroll });
    });
  }, [router]);

  return (
    <NavigationContext.Provider value={navigate}>
      {children}
      <canvas ref={canvas} className="room-transition" aria-hidden="true" />
    </NavigationContext.Provider>
  );
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
