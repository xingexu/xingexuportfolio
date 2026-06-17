import Hero from "@/components/Hero";

/**
 * Home route. Server component — the Hero (a client component for its typing
 * animation) is still server-rendered into the initial HTML, so all content is
 * indexable. The .page-enter wrapper provides the entrance animation via CSS.
 */
export default function Page() {
  return (
    <div className="page-enter">
      <Hero />
    </div>
  );
}
