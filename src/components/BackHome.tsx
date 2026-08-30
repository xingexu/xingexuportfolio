import Link from "next/link";

export default function BackHome() {
  return (
    <div className="back-home-wrap">
      <Link href="/" className="px-btn px-btn-secondary back-home">
        <span aria-hidden>←</span> back home
      </Link>
    </div>
  );
}