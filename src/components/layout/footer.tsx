import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-display text-3xl">Atconiz</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Private intelligence for exceptional real estate. Catalog figures are reference inventory unless
            marked otherwise — never a live MLS feed.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted" aria-label="Footer">
          <Link to="/explore">Explore</Link>
          <Link to="/studio">Intelligence</Link>
          <Link to="/market">Markets</Link>
          <Link to="/calculators">Calculators</Link>
          <Link to="/about">Atelier</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
