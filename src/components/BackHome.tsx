import { TransitionLink as Link } from "@/components/PageTransitions";

/** Tiny "← back home" pill used on pages that branch off the landing page. */
export default function BackHome() {
  return (
    <div className="back-home-wrap">
      <Link href="/" className="px-btn px-btn-secondary back-home">
        <span aria-hidden>←</span> back home
      </Link>
    </div>
  );
}