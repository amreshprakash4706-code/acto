import { Link } from "@tanstack/react-router";
import { useAppStore } from "@/lib/atconiz/store";
import { Button } from "@/components/ui/button";

export function CompareTray() {
  const ids = useAppStore((s) => s.compareIds);
  const clear = useAppStore((s) => s.clearCompare);
  if (ids.length < 2) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-30 flex w-[min(92vw,560px)] -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-border bg-bg-elevated/95 px-4 py-2 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <p className="text-sm text-muted">{ids.length} residences selected</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button asChild size="sm">
          <Link to="/compare" search={{ ids: ids.join(",") }}>
            Compare
          </Link>
        </Button>
      </div>
    </div>
  );
}
