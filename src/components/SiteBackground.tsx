"use client";

import { usePathname } from "next/navigation";
import Background from "./Background";

/** The About route owns its digital scene; unmount the sky and its listeners there. */
export default function SiteBackground() {
  const pathname = usePathname();
  return pathname === "/about" ? null : <Background />;
}
